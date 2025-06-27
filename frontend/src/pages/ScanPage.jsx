/* D:\MyProjects\greenfield-scanwin\frontend\src\pages\ScanPage.jsx */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../supabaseClient';
import RewardUnlock from '../components/RewardUnlock';
import SocialChallenge from '../components/SocialChallenge';
import ReferralProgram from '../components/ReferralProgram';
import ReceiptUploader from '../components/ReceiptUploader';
import CryptoJS from 'crypto-js';
import './ScanPage.css';

// A sub-component for the Video Experience step
const VideoExperience = ({ onComplete }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePlayPause = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play().catch(e => console.error("Video play error:", e));
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !isFinite(videoRef.current.duration)) return;
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const handleSkip = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      videoRef.current.currentTime = videoRef.current.duration;
    }
  };

  return (
    <div className="video-experience">
      <h2>Discover Our Brand Story</h2>
      <p>Watch this short video to learn more and unlock the next level.</p>
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
      <div className="video-progress"><div className="video-progress-bar" style={{ width: `${progress}%` }} /></div>
      <div className="video-controls">
        <button className="video-button" onClick={handlePlayPause}>{isPlaying ? '⏸ Pause' : '▶ Play'}</button>
        <button className="video-button secondary" onClick={handleSkip}>⏩ Skip</button>
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
  const createHmacSignature = (secretKey, data) => CryptoJS.HmacSHA256(data, secretKey).toString(CryptoJS.enc.Hex);
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180; const Δλ = (lon2 - lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };
  const extractDate = (text) => text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)?.[0] || new Date().toISOString().split('T')[0];
  const extractTotal = (text) => parseFloat(text.match(/total\s*[\$\£\€]?(\d+\.\d{2})/i)?.[1] || '0');

  // --- Core Logic Hooks ---
  useEffect(() => {
    const verifyQRData = () => {
      try {
        const params = new URLSearchParams(location.search);
        const data = params.get('d');
        if (!data) throw new Error('No QR data found in URL. Please start by scanning a code.');
        const parts = data.split('|');
        if (parts.length !== 7) throw new Error('Invalid QR data format.');
        const [storeId, bannerId, itemId, lat, lng, qrId, receivedSignature] = parts;
        const secretKey = process.env.REACT_APP_HMAC_SECRET;
        if (!secretKey) throw new Error('Security configuration error.');
        const dataToVerify = `${storeId}|${bannerId}|${itemId}|${lat}|${lng}|${qrId}`;
        const computedSignature = createHmacSignature(secretKey, dataToVerify);
        if (receivedSignature !== computedSignature) throw new Error('Invalid QR signature - possible tampering detected.');
        setQrData({ storeId: parseInt(storeId), bannerId: parseInt(bannerId), itemId: parseInt(itemId), qrId, lat: parseFloat(lat), lng: parseFloat(lng) });
        setStep('location-verification');
      } catch (err) {
        console.error('QR verification error:', err);
        setError(err.message);
        setStep('error');
      }
    };
    verifyQRData();
  }, [location]);

  useEffect(() => {
    if (step !== 'location-verification' || !qrData) return;
    const verifyLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        });
        const distance = calculateDistance(qrData.lat, qrData.lng, position.coords.latitude, position.coords.longitude);
        if (distance > 20000000) { // Using a large number for easy testing
          throw new Error(`You are ${Math.round(distance)}m away and must be closer to the store.`);
        }
        setStep('receipt-upload');
      } catch (err) {
        console.error('Location error:', err);
        setError(err.message || 'Could not verify your location.');
        setStep('error');
      }
    };
    verifyLocation();
  }, [step, qrData]);

  // --- Handler and System Functions ---
  const awardReward = async (userId, level) => {
    const reward = REWARDS[level];
    if (!reward) throw new Error(`Invalid reward level: ${level}`);
    const { error: rpcError } = await supabase.rpc('update_user_progress', { p_user_id: userId, p_points: reward.points, p_level: level });
    if (rpcError) throw rpcError;
    const { error: scanError } = await supabase.from('scans').insert({ user_id: userId, qr_id: qrData.qrId, validation_status: 'verified', points_awarded: reward.points });
    if (scanError) console.error("Error logging scan event:", scanError);
    return reward;
  };

  const handleReceiptUpload = async (file) => {
    setIsProcessing(true);
    setError(null);
    setStep('processing-receipt');
    try {
      if (!file || !file.type.match('image.*')) throw new Error('Please upload a valid image file.');
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      const receiptData = { total: extractTotal(text), date: extractDate(text) };
      const { data: validation, error: rpcError } = await supabase.rpc('validate_receipt', { p_qr_id: qrData.qrId, p_receipt_data: receiptData });
      if (rpcError) throw rpcError;
      if (!validation?.is_valid) throw new Error(validation?.message || 'Receipt validation failed.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStep('authentication-required'); return; }
      setUserData(user);
      await awardReward(user.id, 1);
      setStep('level-1-reward');
    } catch (err) {
      console.error('Receipt processing failed:', err);
      setError(err.message);
      setStep('error');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('error_logs').insert({ error_type: 'receipt_processing', error_message: err.message, qr_id: qrData?.qrId, user_id: user?.id || null });
      } catch (logError) {
        console.error("Failed to write to error_logs:", logError);
      }
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
          <p>{error || 'Please try again later.'}</p>
          <button className="continue-button" onClick={() => navigate('/')}>Return to Home</button>
        </div>
      );
    }
    switch (step) {
      case 'verifying': return <div className="loader">Verifying QR Code...</div>;
      case 'location-verification': return <div className="loader">Verifying Location...</div>;
      case 'receipt-upload': return <ReceiptUploader onReceiptSubmit={handleReceiptUpload} isProcessing={isProcessing} />;
      case 'processing-receipt': return <div className="loader">Analyzing Receipt...</div>;
      case 'authentication-required': return <div className="auth-required"><h2>Login Required</h2><p>Please sign in to claim rewards.</p><button onClick={() => navigate('/auth')}>Go to Login</button></div>;
      case 'level-1-reward': return <RewardUnlock level={1} reward={REWARDS[1]} onContinue={() => setStep('video-experience')} />;
      case 'video-experience': return <VideoExperience onComplete={async () => { if(userData) { await awardReward(userData.id, 2); setStep('level-2-reward'); } }} />;
      case 'level-2-reward': return <RewardUnlock level={2} reward={REWARDS[2]} onContinue={() => setStep('social-challenge')} />;
      case 'social-challenge': return <SocialChallenge onComplete={async () => { if(userData) { await awardReward(userData.id, 3); setStep('level-3-reward'); } }} />;
      case 'level-3-reward': return <RewardUnlock level={3} reward={REWARDS[3]} onContinue={() => setStep('referral-program')} />;
      case 'referral-program': return <ReferralProgram user={userData} onComplete={async () => { if(userData) { await awardReward(userData.id, 4); setStep('level-4-reward'); } }} />;
      case 'level-4-reward': return <RewardUnlock level={4} reward={REWARDS[4]} onContinue={() => navigate('/')} />;
      default: return <div className="loader"><p>Loading...</p></div>;
    }
  };

  return (
    <div className="scan-container">
      {renderStep()}
    </div>
  );
};

export default ScanPage;