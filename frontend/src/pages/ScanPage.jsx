import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../supabaseClient';
import RewardUnlock from '../components/RewardUnlock';
import SocialChallenge from '../components/SocialChallenge';
import ReferralProgram from '../components/ReferralProgram';
import CryptoJS from 'crypto-js';
import './ScanPage.css';

// --- Reusable Components defined inside ScanPage for simplicity ---

// Video Experience Component
const VideoExperience = ({ onComplete }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(e => console.error("Video play error:", e));
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration;
    if (isFinite(duration)) {
        setProgress((videoRef.current.currentTime / duration) * 100);
    }
  };

  const handleSkip = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = videoRef.current.duration;
    }
    // Directly call onComplete after setting time to end, as the 'onEnded' event will fire.
  };

  return (
    <div className="video-experience">
      <h2>Discover Our Brand Story</h2>
      <p>Watch this short video to learn more about our products and unlock the next level.</p>
      
      <div className="video-wrapper">
        <video
          ref={videoRef}
          src="/videos/brand-story.mp4"
          poster="/images/video-poster.jpg"
          onTimeUpdate={handleTimeUpdate}
          onEnded={onComplete}
          playsInline
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


// --- Main ScanPage Component ---

const ScanPage = () => {
  const [step, setStep] = useState('verifying');
  const [qrData, setQrData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const REWARDS = {
    1: { type: 'coupon', value: '10OFF', points: 50, description: '10% discount on next purchase' },
    2: { type: 'content', value: 'Exclusive Content', points: 100, description: 'Premium content unlocked' },
    3: { type: 'social', value: 'AR Filter', points: 150, description: 'Special AR filter for social media' },
    4: { type: 'referral', value: '25% Rebate', points: 250, description: '25% cashback for referrals' }
  };

  // --- Helper Functions ---
  const createHmacSignature = (secretKey, data) => {
    return CryptoJS.HmacSHA256(data, secretKey).toString(CryptoJS.enc.Hex);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const extractDate = (text) => text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/)?.[0] || new Date().toISOString().split('T')[0];
  const extractTime = (text) => text.match(/\d{1,2}:\d{2}(:\d{2})?/)?.[0] || new Date().toISOString().split('T')[1].split('.')[0];
  const extractItems = (text) => {
    const itemLines = text.split('\n').filter(line => line.match(/\w+\s+\d+\.\d{2}/)).map(line => {
        const parts = line.split(/\s{2,}/);
        return { name: parts[0], price: parseFloat(parts[1]) };
    });
    return itemLines.slice(0, 5);
  };
  const extractTotal = (text) => parseFloat(text.match(/total\s*[\$\£\€]?(\d+\.\d{2})/i)?.[1] || '0');

  // --- Core Logic Hooks ---

  // 1. QR Code Verification
  useEffect(() => {
    const verifyQRData = () => {
      const params = new URLSearchParams(location.search);
      const data = params.get('d');
      if (!data) {
        throw new Error('No QR data found in URL. Please scan a code to begin.');
      }
      
      const parts = data.split('|');
      if (parts.length !== 7) {
        throw new Error(`Invalid QR data format.`);
      }

      const [storeId, bannerId, itemId, lat, lng, qrId, receivedSignature] = parts;
      const secretKey = process.env.REACT_APP_HMAC_SECRET;
      if (!secretKey) {
        throw new Error('Security configuration error on the website.');
      }

      const dataToVerify = `${storeId}|${bannerId}|${itemId}|${lat}|${lng}|${qrId}`;
      const computedSignature = createHmacSignature(secretKey, dataToVerify);

      if (receivedSignature !== computedSignature) {
        throw new Error('Invalid QR signature - possible tampering detected.');
      }

      setQrData({ storeId: parseInt(storeId), bannerId: parseInt(bannerId), itemId: parseInt(itemId), qrId, lat: parseFloat(lat), lng: parseFloat(lng) });
      setStep('location-verification');
    };

    try {
      verifyQRData();
    } catch (err) {
      console.error('QR verification error:', err);
      setError(err.message);
      setStep('error');
    }
  }, [location]);

  // 2. Location Verification
  useEffect(() => {
    if (step !== 'location-verification' || !qrData) return;
    
    const verifyLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        });
        const { latitude: userLat, longitude: userLng } = position.coords;
        const distance = calculateDistance(qrData.lat, qrData.lng, userLat, userLng);

        // Using a large number for testing. Change to 100 for production.
        if (distance > 20000000) {
          throw new Error(`You're ${Math.round(distance)}m away - must be within the required distance of the store`);
        }
        setStep('receipt-upload');
      } catch (err) {
        console.error('Location error:', err);
        setError(err.message || 'Location access denied or timed out.');
        setStep('error');
      }
    };
    verifyLocation();
  }, [step, qrData]);

  // --- Handler and System Functions ---

  const awardReward = async (userId, level) => {
    const reward = REWARDS[level];
    if (!reward) throw new Error(`Invalid reward level: ${level}`);
    const { error } = await supabase.rpc('update_user_progress', { p_user_id: userId, p_points: reward.points, p_level: level });
    if (error) throw error;
    
    // Log the successful scan event to the scans table
    const { error: scanError } = await supabase.from('scans').insert({ user_id: userId, qr_id: qrData.qrId, validation_status: 'verified', points_awarded: reward.points });
    if (scanError) console.error("Error logging scan event:", scanError); // Log non-fatally
    
    return reward;
  };
  
  const handleReceiptUpload = async (file) => {
    setIsProcessing(true);
    setError(null);
    setStep('processing-receipt');
    try {
      if (!file || !file.type.match('image.*')) {
        throw new Error('Please upload a valid image file (JPEG/PNG).');
      }
      const text = await Tesseract.recognize(file, 'eng');
      const receiptData = { date: extractDate(text.data.text), time: extractTime(text.data.text), items: extractItems(text.data.text), total: extractTotal(text.data.text) };
      const { data: validation, error: rpcError } = await supabase.rpc('validate_receipt', { p_qr_id: qrData.qrId, p_receipt_data: receiptData });
      if (rpcError) throw rpcError;
      if (!validation?.is_valid) {
        throw new Error(validation?.message || 'Receipt validation failed.');
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
      setError(err.message || 'Receipt processing error.');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI Rendering ---

  const renderStep = () => {
    if (step === 'error') {
      return (
        <div className="error-message">
          <h2>An Error Occurred</h2>
          <p>{error || 'Please try again later'}</p>
          <button className="continue-button" onClick={() => navigate('/')}>Return to Home</button>
        </div>
      );
    }

    switch (step) {
      case 'verifying':
        return <div className="loader">Verifying QR code...</div>;
      case 'location-verification':
        return <div className="loader">Verifying Location...</div>;
      case 'receipt-upload':
        return (
          <div className="receipt-upload">
            <h2>Upload Your Receipt</h2>
            <p>Please upload a clear photo of your purchase receipt.</p>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={(e) => handleReceiptUpload(e.target.files[0])} 
              disabled={isProcessing} 
            />
            {isProcessing && <div className="loader">Processing...</div>}
          </div>
        );
      case 'processing-receipt':
        return <div className="loader">Analyzing receipt...</div>;
      case 'authentication-required':
        return <div className="auth-required"><h2>Login Required</h2><p>Please sign in to claim your rewards.</p><button onClick={() => navigate('/auth')}>Go to Login</button></div>;
      case 'level-1-reward':
        return <RewardUnlock level={1} reward={REWARDS[1]} onContinue={() => setStep('video-experience')} />;
      case 'video-experience':
        return <VideoExperience onComplete={async () => { await awardReward(userData.id, 2); setStep('level-2-reward'); }} />;
      case 'level-2-reward':
        return <RewardUnlock level={2} reward={REWARDS[2]} onContinue={() => setStep('social-challenge')} />;
      case 'social-challenge':
        return <SocialChallenge onComplete={async () => { await awardReward(userData.id, 3); setStep('level-3-reward'); }} />;
      case 'level-3-reward':
        return <RewardUnlock level={3} reward={REWARDS[3]} onContinue={() => setStep('referral-program')} />;
      case 'referral-program':
        return <ReferralProgram user={userData} onComplete={async () => { await awardReward(userData.id, 4); setStep('level-4-reward'); }} />;
      case 'level-4-reward':
        return <RewardUnlock level={4} reward={REWARDS[4]} onContinue={() => navigate('/')} />;
      default:
        return <div className="loader"><p>Loading scan experience...</p></div>;
    }
  };

  return (
    <div className="scan-container">
      {renderStep()}
    </div>
  );
};

export default ScanPage;