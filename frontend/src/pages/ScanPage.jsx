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
      
      console.log('[DEBUG] QR Data from URL:', data);

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
        
        // --- CORRECTED DISTANCE CALCULATION ---
        const R = 6371e3; // Earth's radius in meters
        const φ1 = qrData.lat * Math.PI/180;
        const φ2 = userLat * Math.PI/180;
        const Δφ = (userLat - qrData.lat) * Math.PI/180;
        const Δλ = (userLng - qrData.lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        const distance = R * c; // Final distance in meters
        // -----------------------------------------

        console.log(`[DEBUG] Location Check: Distance is ${distance.toFixed(2)} meters`);

        if (distance > 20000000) { // Using a large number for testing
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

      if (rpcError || !validation?.is_valid) {
        throw rpcError || new Error('Receipt could not be validated by the system.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStep('authentication-required');
        return;
      }

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setUserData(userProfile);

      const { data: qrInfo } = await supabase.from('qr_codes').select('campaign_id').eq('id', qrData.qrId).single();
      if (qrInfo?.campaign_id) {
        const { data: campaignData } = await supabase.from('campaigns').select('*').eq('id', qrInfo.campaign_id).single();
        setCampaign(campaignData);
      }

      await awardReward(user.id, 1);
      setStep('level-1-reward');

    } catch (err) {
      console.error('Receipt processing error:', err);
      setError(err.message);
      setStep('processing-error');
      
      await supabase.from('error_logs').insert({
        error_type: 'receipt_processing',
        error_message: err.message,
        qr_id: qrData?.qrId,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });
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
  const extractDate = (text) => {
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const match = text.match(dateRegex);
    return match ? match[1] : new Date().toISOString().split('T')[0];
  };
  const extractTime = (text) => {
    const timeRegex = /(\d{1,2}:\d{2}(:\d{2})?)/;
    const match = text.match(timeRegex);
    return match ? match[1] : new Date().toISOString().split('T')[1].split('.')[0];
  };
  const extractItems = (text) => {
    const itemRegex = /([A-Z]{2,}.+?)\s+(\d+\.\d{2})/g;
    const items = [];
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      if (match[1].trim().length > 3) {
        items.push({ name: match[1].trim(), price: parseFloat(match[2]) });
      }
    }
    return items;
  };
  const extractTotal = (text) => {
    const totalRegex = /total\s+(\d+\.\d{2})/i;
    const match = text.match(totalRegex);
    return match ? parseFloat(match[1]) : 0;
  };

  // --- UI RENDERING ---
  const renderStep = () => {
    if (error) {
      return (
        <div className="error-message">
          <h2>An Error Occurred</h2>
          <p>{error}</p>
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
            <input type="file" accept="image/*" onChange={(e) => handleReceiptUpload(e.target.files[0])} disabled={isProcessing} />
            {isProcessing && <p>Processing...</p>}
          </div>
        );
      // Other cases would be added here based on the full UI flow
      // e.g., case 'level-1-reward': return <RewardUnlock ... />
      default:
        return <div>Loading or invalid step...</div>;
    }
  };

  return (
    <div className="scan-container">
      {renderStep()}
    </div>
  );
};

export default ScanPage;