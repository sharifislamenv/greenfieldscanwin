// D:\MyProjects\greenfield-scanwin\frontend\src\pages\ScanPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../supabaseClient';
import RewardUnlock from '../components/RewardUnlock';
import SocialChallenge from '../components/SocialChallenge';
import ReferralProgram from '../components/ReferralProgram';
import CryptoJS from 'crypto-js';
import './ScanPage.css';

const REWARDS = {
  1: { type: 'coupon', value: '10OFF', points: 50, description: '10% discount on next purchase' },
  2: { type: 'content', value: 'Exclusive Content', points: 100, description: 'Premium content unlocked' },
  3: { type: 'social', value: 'AR Filter', points: 150, description: 'Special AR filter for social media' },
  4: { type: 'referral', value: '25% Rebate', points: 250, description: '25% cashback for referrals' }
};

const ScanPage = () => {
  const [step, setStep] = useState('verifying');
  const [qrData, setQrData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Video Experience Component
  const VideoExperience = ({ onComplete }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const handlePlayPause = () => {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleTimeUpdate = () => {
      const duration = videoRef.current.duration || 1;
      setProgress((videoRef.current.currentTime / duration) * 100);
    };

    const handleSkip = () => {
      videoRef.current.currentTime = videoRef.current.duration - 0.5;
      onComplete();
    };

    return (
      <div className="video-experience">
        <h2>Discover Our Brand Story</h2>
        <p>Watch this short video to learn more about our products</p>
        
        <div className="video-wrapper">
          <video
            ref={videoRef}
            src="/videos/brand-story.mp4"
            poster="/images/video-poster.jpg"
            onTimeUpdate={handleTimeUpdate}
            onEnded={onComplete}
          />
        </div>
        
        <div className="video-progress">
          <div className="video-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        
        <div className="video-controls">
          <button className="video-button" onClick={handlePlayPause}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="video-button secondary" onClick={handleSkip}>
            ⏩ Skip
          </button>
        </div>
      </div>
    );
  };

  // HMAC-SHA256 signature creation
  const createHmacSignature = (secretKey, data) => {
    return CryptoJS.HmacSHA256(data, secretKey).toString(CryptoJS.enc.Hex);
  };

  // Haversine distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R;
  };

  // QR Code Verification - Fixed Version
  useEffect(() => {
    const verifyQRData = async () => {
      try {
        // Get the raw query string
        const queryString = window.location.search;
        if (!queryString) {
          throw new Error('No query parameters found');
        }
        
        // Parse the query parameters
        const params = new URLSearchParams(queryString);
        const encodedData = params.get('d');
        
        if (!encodedData) {
          throw new Error('No QR data parameter found');
        }

        // Decode the URI component to handle special characters
        const decodedData = decodeURIComponent(encodedData);
        
        const parts = decodedData.split('|');
        
        if (parts.length !== 7) {
          throw new Error(`Invalid QR data format. Expected 7 parts, got ${parts.length}`);
        }

        const [storeId, bannerId, itemId, lat, lng, qrId, receivedSignature] = parts;
        const secretKey = process.env.REACT_APP_HMAC_SECRET;
        
        if (!secretKey) {
          throw new Error('Security configuration error - HMAC secret not set');
        }

        const dataToVerify = `${storeId}|${bannerId}|${itemId}|${lat}|${lng}|${qrId}`;
        const computedSignature = createHmacSignature(secretKey, dataToVerify);

        if (receivedSignature !== computedSignature) {
          throw new Error('Invalid QR signature - possible tampering detected');
        }

        setQrData({
          storeId: parseInt(storeId),
          bannerId: parseInt(bannerId),
          itemId: parseInt(itemId),
          qrId,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        });
        setStep('location-verification');
      } catch (err) {
        console.error('QR verification error:', err);
        setError(err.message || 'QR verification failed');
        setStep('error');
      }
    };

    verifyQRData();
  }, [location]);

  // Location Verification
  useEffect(() => {
    const verifyLocation = async () => {
      if (step !== 'location-verification' || !qrData) return;

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });
        });

        const { latitude: userLat, longitude: userLng } = position.coords;
        const distance = calculateDistance(qrData.lat, qrData.lng, userLat, userLng);

        if (distance > 3100) {
          throw new Error(`You're ${Math.round(distance)}m away - must be within 3100m of store`);
        }

        setStep('receipt-upload');
      } catch (err) {
        console.error('Location error:', err);
        setError(err.message || 'Location verification failed');
        setStep('error');
      }
    };

    verifyLocation();
  }, [step, qrData]);

  // Process receipt image with OCR
  const processReceiptImage = async (file) => {
    const { data } = await Tesseract.recognize(file, 'eng');
    return data.text;
  };

  // Receipt Processing
  const handleReceiptUpload = async (file) => {
    setIsProcessing(true);
    setError(null);
    setStep('processing-receipt');
  
    try {
      if (!file || !file.type.match('image.*')) {
        throw new Error('Please upload a valid image file (JPEG/PNG)');
      }
  
      const text = await processReceiptImage(file);
      
      const receiptData = {
        date: extractDate(text),
        time: extractTime(text),
        items: extractItems(text),
        total: extractTotal(text)
      };
  
      const { data: validation, error: rpcError } = await supabase.rpc('validate_receipt', {
        p_qr_id: qrData.qrId,
        p_receipt_data: receiptData
      });
  
      if (rpcError) throw rpcError;
      if (!validation?.is_valid) {
        throw new Error(validation?.message || 'Receipt validation failed');
      }
  
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStep('authentication-required');
        return;
      }
      
      setUserData(user);
      await awardReward(user.id, 1);
      setStep('level-1-reward');
      
    } catch (err) {
      console.error('Receipt processing failed:', err);
      setError(err.message || 'Receipt processing error');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reward System
  const awardReward = async (userId, level) => {
    const reward = REWARDS[level];
    if (!reward) throw new Error(`Invalid reward level: ${level}`);
  
    const { error } = await supabase.rpc('update_user_progress', {
      p_user_id: userId,
      p_points: reward.points,
      p_level: level
    });
    
    if (error) throw error;
    return reward;
  };

  // Receipt Parsing Functions
  const extractDate = (text) => {
    const dateMatch = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/);
    return dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
  };

  const extractTime = (text) => {
    const timeMatch = text.match(/\d{1,2}:\d{2}(:\d{2})?/);
    return timeMatch ? timeMatch[0] : new Date().toISOString().split('T')[1].split('.')[0];
  };

  const extractItems = (text) => {
    const itemLines = text.split('\n')
      .filter(line => line.match(/\w+\s+\d+\.\d{2}/))
      .map(line => {
        const [name, price] = line.split(/\s{2,}/);
        return { name, price: parseFloat(price) };
      });
    return itemLines.slice(0, 5);
  };

  const extractTotal = (text) => {
    const totalMatch = text.match(/total\s*[\$\£\€]?(\d+\.\d{2})/i);
    return totalMatch ? parseFloat(totalMatch[1]) : 0;
  };

  // UI Rendering
  const renderStep = () => {
    if (step === 'error') {
      return (
        <div className="error-message">
          <h2>An Error Occurred</h2>
          <p>{error || 'Please try again later'}</p>
          <button onClick={() => navigate('/')}>Return to Home</button>
        </div>
      );
    }

    switch (step) {
      case 'verifying':
        return <div className="loader">Verifying QR code...</div>;
      
      case 'location-verification':
        return (
          <div className="location-check">
            <h2>Verifying Location</h2>
            <p>Checking your proximity to the store...</p>
          </div>
        );
      
      case 'receipt-upload':
        return (
          <div className="receipt-upload">
            <h2>Upload Your Receipt</h2>
            <p>Please upload a clear photo of your purchase receipt</p>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" /* <-- Allow users to take a photo directly with their camera for a receipt upload */
              onChange={(e) => handleReceiptUpload(e.target.files[0])} 
              disabled={isProcessing} 
            />
            {isProcessing && <div className="loader">Processing...</div>}
          </div>
        );
      
      case 'processing-receipt':
        return <div className="loader">Analyzing receipt...</div>;
      
      case 'authentication-required':
        return (
          <div className="auth-required">
            <h2>Login Required</h2>
            <p>Please sign in to claim your rewards</p>
            <button onClick={() => navigate('/auth')}>Go to Login</button>
          </div>
        );
      
      case 'level-1-reward':
        return (
          <RewardUnlock 
            level={1} 
            reward={REWARDS[1]} 
            onContinue={() => setStep('video-experience')} 
          />
        );
      
      case 'video-experience':
        return (
          <VideoExperience 
            onComplete={async () => {
              await awardReward(userData.id, 2);
              setStep('level-2-reward');
            }} 
          />
        );
      
      case 'level-2-reward':
        return (
          <RewardUnlock 
            level={2} 
            reward={REWARDS[2]} 
            onContinue={() => setStep('social-challenge')} 
          />
        );
      
      case 'social-challenge':
        return (
          <SocialChallenge 
            onComplete={async () => {
              await awardReward(userData.id, 3);
              setStep('level-3-reward');
            }} 
          />
        );
      
      case 'level-3-reward':
        return (
          <RewardUnlock 
            level={3} 
            reward={REWARDS[3]} 
            onContinue={() => setStep('referral-program')} 
          />
        );
      
      case 'referral-program':
        return (
          <ReferralProgram 
            onComplete={async () => {
              await awardReward(userData.id, 4);
              setStep('level-4-reward');
            }} 
          />
        );
      
      case 'level-4-reward':
        return (
          <RewardUnlock 
            level={4} 
            reward={REWARDS[4]} 
            onContinue={() => navigate('/')} 
          />
        );
      
      default:
        return <div className="default-state"><p>Loading scan experience...</p></div>;
    }
  };

  return (
    <div className="scan-container">
      {renderStep()}
    </div>
  );
};

export default ScanPage;