// D:\MyProjects\greenfield-scanwin\frontend\src\pages\ScanPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../supabaseClient';
import RewardUnlock from '../components/RewardUnlock';
import SocialChallenge from '../components/SocialChallenge';
import ReferralProgram from '../components/ReferralProgram';
import VideoExperience from '../components/VideoExperience';
import CryptoJS from 'crypto-js';

const ScanPage = () => {
  // State management
  const [step, setStep] = useState('verifying');
  const [qrData, setQrData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // HMAC-SHA256 signature creation
  const createHmacSignature = (secretKey, data) => {
    const signature = CryptoJS.HmacSHA256(data, secretKey);
    return signature.toString(CryptoJS.enc.Hex);
  };

  // QR Code Verification
  useEffect(() => {
    const verifyQRData = async () => {
      const params = new URLSearchParams(location.search);
      const data = params.get('d');
      
      if (!data) {
        return; // No data in URL, do nothing
      }

      const parts = data.split('|');
      
      if (parts.length !== 7) {
        setError('Invalid QR data format.');
        setStep('error');
        return;
      }

      const [storeId, bannerId, itemId, lat, lng, qrId, receivedSignature] = parts;
      const secretKey = process.env.REACT_APP_HMAC_SECRET;

      if (!secretKey) {
        setError('HMAC secret key is not configured.');
        setStep('error');
        return;
      }

      const dataToVerify = `${storeId}|${bannerId}|${itemId}|${lat}|${lng}|${qrId}`;
      const computedSignature = createHmacSignature(secretKey, dataToVerify);

      if (receivedSignature !== computedSignature) {
        setError('Invalid QR code signature. The code may be fraudulent or tampered with.');
        setStep('error');
        return;
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
    };

    verifyQRData().catch(err => {
      console.error('QR verification error:', err);
      setError(err.message);
      setStep('error');
    });
  }, [location]);

  // Location Verification
  useEffect(() => {
    const verifyLocation = async () => {
      if (step !== 'location-verification' || !qrData) return;

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const { latitude: userLat, longitude: userLng } = position.coords;
        const R = 6371e3; // Earth's radius in meters
        const φ1 = qrData.lat * Math.PI/180;
        const φ2 = userLat * Math.PI/180;
        const Δφ = (userLat - qrData.lat) * Math.PI/180;
        const Δλ = (userLng - qrData.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Using a large number for testing. Change to 100 for production.
        if (distance > 20000000) { 
          setError('You must be within the required distance of the store.');
          setStep('error');
          return;
        }

        setStep('receipt-upload');
      } catch (err) {
        console.error('Location error:', err);
        setError(err.message);
        setStep('error');
      }
    };

    verifyLocation();
  }, [step, qrData]);

  // Receipt Processing
  const handleReceiptUpload = async (file) => {
    setIsProcessing(true);
    setError(null);
    setStep('processing-receipt');
  
    try {
      if (!file || !file.type.match('image.*')) {
        throw new Error('Please upload a valid image file.');
      }
  
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });
  
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
  
      if (rpcError) {
          throw rpcError;
      }
      
      if (!validation?.is_valid) {
          const reason = validation?.message || 'Unknown';
          throw new Error(`Receipt could not be validated. Reason: ${reason}`);
      }
  
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          setStep('authentication-required');
          return;
      }
      await awardReward(user.user.id, 1);
      setStep('level-1-reward');
      
    } catch (err) {
      // --- FIX APPLIED HERE ---
      // This updated catch block safely handles the error logging
      // even when no user is logged in, preventing the app from crashing.
      console.error('Receipt processing failed:', err);
      setError(err.message);
      setStep('error');
      
      try {
          const { data: { user } } = await supabase.auth.getUser();
          
          // Check if user exists before accessing user.id
          await supabase.from('error_logs').insert({
              error_type: 'receipt_processing',
              error_message: err.message,
              qr_id: qrData?.qrId,
              user_id: user ? user.id : null // This prevents the crash
          });
      } catch (logError) {
          console.error("Failed to write to error_logs:", logError);
      }
      // ----------------------
  
    } finally {
      setIsProcessing(false);
    }
  };

  // Reward System
  const awardReward = async (userId, level) => {
    const rewards = {
      1: { type: 'coupon', value: '10OFF', points: 50 },
      2: { type: 'content', value: 'Exclusive Content', points: 100 },
      3: { type: 'social', value: 'AR Filter', points: 150 },
      4: { type: 'referral', value: '25% Rebate', points: 250 }
    };
    const reward = rewards[level];
    if (!reward) throw new Error(`Invalid reward level: ${level}`);
  
    const { error } = await supabase.rpc('update_user_progress', {
      p_user_id: userId,
      p_points: reward.points,
      p_level: level
    });
    if (error) throw error;
    return reward;
  };

  // Receipt Parsing Helpers (placeholders)
  const extractDate = (text) => new Date().toISOString().split('T')[0];
  const extractTime = (text) => new Date().toISOString().split('T')[1].split('.')[0];
  const extractItems = (text) => [];
  const extractTotal = (text) => 0;

  // UI Rendering
  const renderStep = () => {
    if (step === 'error') {
        return (
            <div className="error-message">
                <h2>An Error Occurred</h2>
                <p>{error || 'An unknown error occurred. Please try again.'}</p>
                <button onClick={() => navigate('/')}>Return to Home</button>
            </div>
        );
    }
  
    switch (step) {
      case 'verifying':
        return <div className="loader">Verifying QR code...</div>;
      case 'location-verification':
        return <div className="location-check"><h2>Location Verification</h2><p>Checking your proximity...</p></div>;
      case 'receipt-upload':
        return (
          <div className="receipt-upload">
            <h2>Upload Your Receipt</h2>
            <p>Please upload a clear photo of your purchase receipt.</p>
            <input type="file" accept="image/*" onChange={(e) => handleReceiptUpload(e.target.files[0])} disabled={isProcessing} />
            {isProcessing && <div className="loader">Processing your receipt...</div>}
          </div>
        );
      case 'processing-receipt':
        return <div className="loader">Processing your receipt...</div>;
      case 'authentication-required':
          return <div className="error-message"><h2>Authentication Required</h2><p>Please log in to claim your rewards.</p><button onClick={() => navigate('/auth')}>Go to Login</button></div>;
      case 'level-1-reward':
        return <RewardUnlock level={1} reward={{ type: 'coupon', value: '10% Off', description: 'A coupon has been added to your profile!' }} onContinue={() => setStep('level-2-challenge')} />;
      
      default:
        return <div><p>Loading or invalid step...</p></div>;
    }
  };

  return (
    <div className="scan-container">
      {renderStep()}
    </div>
  );
};

export default ScanPage;