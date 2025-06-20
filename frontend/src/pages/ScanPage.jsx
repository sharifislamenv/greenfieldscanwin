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
        console.log('No QR data found in URL');
        return;
      }

      const parts = data.split('|');
      
      if (parts.length !== 7) {
        setError('Invalid QR data format');
        setStep('invalid-format');
        return;
      }

      const [storeId, bannerId, itemId, lat, lng, qrId, receivedSignature] = parts;
      const secretKey = process.env.REACT_APP_HMAC_SECRET;

      if (!secretKey) {
        setError('HMAC secret key not configured');
        setStep('invalid-signature');
        return;
      }

      const dataToVerify = `${storeId}|${bannerId}|${itemId}|${lat}|${lng}|${qrId}`;
      const computedSignature = createHmacSignature(secretKey, dataToVerify);

      if (receivedSignature !== computedSignature) {
        setError('Invalid QR code signature');
        setStep('invalid-signature');
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
      setStep('processing-error');
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

        // Use a large number for testing, change to 100 for production
        if (distance > 20000000) { 
          setError('You must be within the required distance of the store.');
          setStep('location-mismatch');
          return;
        }

        setStep('receipt-upload');
      } catch (err) {
        console.error('Location error:', err);
        setError(err.message);
        setStep('location-error');
      }
    };

    verifyLocation();
  }, [step, qrData]);

  // --- UPDATED FUNCTION with Enhanced Error Handling ---
  const handleReceiptUpload = async (file) => {
    setIsProcessing(true);
    setError(null);
    setStep('processing-receipt');
  
    try {
      // Validate file type
      if (!file || !file.type.match('image.*')) {
        throw new Error('Please upload a valid image file.');
      }
  
      // 1. Perform OCR
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log('OCR Progress:', m)
      });
  
      // 2. Parse receipt data
      const receiptData = {
        date: extractDate(text),
        time: extractTime(text),
        items: extractItems(text),
        total: extractTotal(text)
      };
  
      // 3. Validate with backend
      const { data: validation, error: rpcError } = await supabase.rpc('validate_receipt', {
        p_qr_id: qrData.qrId,
        p_receipt_data: receiptData
      });
  
      if (rpcError) {
          // If the RPC call itself fails, throw the error to be caught below
          throw rpcError;
      }
      
      if (!validation?.is_valid) {
          // If the function returns is_valid = false
          throw new Error('Receipt could not be validated by the system. Reason: ' + (validation?.message || 'Unknown'));
      }
  
      // --- If validation is successful, continue with the reward logic ---
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          setStep('authentication-required');
          return;
      }
      await awardReward(user.id, 1); // Example: Award level 1 reward
      setStep('level-1-reward');
      
    } catch (err) {
      console.error('Receipt processing failed:', err);
      
      // Provide a more user-friendly message for specific, known errors
      if (err.code === '42703') { // This is the PostgreSQL code for "undefined column"
        setError('A system configuration error occurred. Please contact support.');
      } else {
        setError(err.message);
      }
      setStep('processing-error');
      
      // Log the detailed error to your database for your own debugging
      try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('error_logs').insert({
              error_type: 'receipt_processing',
              error_message: err.message,
              qr_id: qrData?.qrId,
              user_id: user?.id
          });
      } catch (logError) {
          console.error("Failed to write to error_logs:", logError);
      }
  
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

  // Receipt Parsing Helpers
  const extractDate = (text) => { /* ... unchanged ... */ return new Date().toISOString().split('T')[0]; };
  const extractTime = (text) => { /* ... unchanged ... */ return new Date().toISOString().split('T')[1].split('.')[0]; };
  const extractItems = (text) => { /* ... unchanged ... */ return []; };
  const extractTotal = (text) => { /* ... unchanged ... */ return 0; };

  // UI Rendering
  const renderStep = () => {
    // A single, unified error display
    if (step === 'processing-error' || step === 'location-error' || step === 'invalid-signature' || step === 'invalid-format' || step === 'location-mismatch') {
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
          return <div className="error-message"><h2>Authentication Required</h2><p>Please log in to claim your rewards.</p><button onClick={() => navigate('/auth')}>Go to Login</button></div>
      case 'level-1-reward':
        return <RewardUnlock level={1} reward={{ type: 'coupon', value: '10% Off', description: 'A coupon has been added to your profile!' }} onContinue={() => setStep('level-2-challenge')} />;
      // --- Cases for other levels and challenges would go here ---
      // case 'level-2-challenge': return <VideoExperience ... />;
      
      default:
        return <div><p>Loading...</p></div>;
    }
  };

  return (
    <div className="scan-container">
      {renderStep()}
    </div>
  );
};

export default ScanPage;