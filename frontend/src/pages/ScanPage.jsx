// D:\MyProjects\greenfield-scanwin\frontend\src\pages\ScanPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { supabase } from '../supabaseClient';
import RewardUnlock from '../components/RewardUnlock';
import SocialChallenge from '../components/SocialChallenge';
import ReferralProgram from '../components/ReferralProgram';
import VideoExperience from '../components/VideoExperience';
import CryptoJS from 'crypto-js'; // Import the crypto library

const ScanPage = () => {
  const [step, setStep] = useState('verifying');
  const [qrData, setQrData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // --- UPDATED useEffect hook for verification ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const data = params.get('d');
    
    console.log('ScanPage: Initializing. URL Data:', data);

    if (data) {
      const parts = data.split('|');
      console.log('ScanPage: Parsed parts:', parts);

      if (parts.length === 7) {
        const [storeId, bannerId, itemId, lat, lng, qrId, signature] = parts;
        
        const secretKey = process.env.REACT_APP_HMAC_SECRET;
        if (!secretKey) {
          console.error('HMAC secret key not configured');
          setStep('invalid-signature');
          return;
        }

        console.log('ScanPage: Using secret key:', secretKey);
        
        const dataString = `${storeId}|${bannerId}|${itemId}|${lat}|${lng}|${qrId}`;
        const computedSignature = createHmacSignature(secretKey, dataString);
        
        console.log('ScanPage: Data string:', dataString);
        console.log('ScanPage: Received signature:', signature);
        console.log('ScanPage: Computed signature:', computedSignature);

        // Secure comparison
        if (computedSignature === signature) {
          console.log('ScanPage: Signature valid');
          setQrData({
            storeId: parseInt(storeId),
            bannerId: parseInt(bannerId),
            itemId: parseInt(itemId),
            qrId,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
          });
          setStep('location-verification');
        } else {
          console.warn('ScanPage: Invalid signature');
          setStep('invalid-signature');
        }
      } else {
        console.error('ScanPage: Invalid data format');
        setStep('invalid-format');
      }
    }
  }, [location]);

  // (The rest of your ScanPage component remains the same)
  // ... from "useEffect for location verification" down to the return statement ...

  // Verify location
  useEffect(() => {
    if (step === 'location-verification' && qrData) {
      console.log('ScanPage: Initiating location verification...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          const R = 6371e3;
          const φ1 = qrData.lat * Math.PI/180;
          const φ2 = userLat * Math.PI/180;
          const Δφ = (userLat - qrData.lat) * Math.PI/180;
          const Δλ = (userLng - qrData.lng) * Math.PI/180;
          
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          
          const distance = R * c;
          console.log(`ScanPage: User location: (${userLat}, ${userLng}), QR location: (${qrData.lat}, ${qrData.lng}), Distance: ${distance.toFixed(2)} meters`);

          if (distance <= 100) {
            console.log('ScanPage: LOCATION VERIFICATION: SUCCESS (within 100m)');
            setStep('receipt-upload');
          } else {
            console.warn('ScanPage: LOCATION VERIFICATION: FAILED! Distance too far.');
            setStep('location-mismatch');
          }
        },
        (error) => {
          console.error('ScanPage: Location access error:', error);
          setStep('location-error');
        }
      );
    }
  }, [step, qrData]);

  // (All other functions like handleReceiptUpload, awardReward, etc., remain here)
  const handleReceiptUpload = async (file) => {
    setStep('processing-receipt');
    console.log('ScanPage: Processing receipt...');
    
    try {
      // OCR Processing
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log('Tesseract:', m) // Tesseract progress
      });
      console.log('ScanPage: OCR Text Result:', text);
      
      // Parse receipt data
      const receiptData = {
        date: extractDate(text),
        time: extractTime(text),
        items: extractItems(text),
        total: extractTotal(text)
      };
      console.log('ScanPage: Parsed Receipt Data:', receiptData);
      
      // Validate receipt (assuming rpc validate_receipt exists in Supabase)
      const { data: validation, error: rpcError } = await supabase.rpc('validate_receipt', {
        p_qr_id: qrData.qrId,
        p_receipt_data: JSON.stringify(receiptData)
      });

      if (rpcError) throw rpcError;
      console.log('ScanPage: Receipt validation RPC result:', validation);
      
      if (validation && validation.is_valid) { // Ensure validation is not null and has is_valid
        console.log('ScanPage: RECEIPT VALIDATION: SUCCESS');
        // Get user data
        const { data: user } = await supabase.auth.getUser();
        if (!user) { // Ensure user is authenticated
            console.error('ScanPage: User not authenticated for reward processing.');
            setStep('authentication-required'); // Or redirect to auth page
            return;
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.user.id)
          .single();
          
        if (profileError) throw profileError;
        setUserData(userProfile);
        console.log('ScanPage: User Profile fetched:', userProfile);
        
        // Check for campaign
        const { data: qrInfo, error: qrInfoError } = await supabase
          .from('qr_codes')
          .select('campaign_id')
          .eq('id', qrData.qrId)
          .single();
          
        if (qrInfoError) throw qrInfoError;
        console.log('ScanPage: QR Info (Campaign ID):', qrInfo?.campaign_id);

        if (qrInfo?.campaign_id) {
          const { data: campaignData, error: campaignError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', qrInfo.campaign_id)
            .single();
          if (campaignError) throw campaignError;
          setCampaign(campaignData);
          console.log('ScanPage: Active Campaign Data:', campaignData);
        }
        
        // Award level 1 reward
        const reward1 = await awardReward(user.user.id, 1);
        console.log('ScanPage: Level 1 Reward Awarded:', reward1);
        setStep('level-1-reward');
      } else {
        console.warn('ScanPage: RECEIPT VALIDATION: FAILED!');
        setStep('validation-failed');
      }
    } catch (error) {
      console.error('ScanPage: Receipt processing or validation error:', error.message);
      setStep('processing-error');
    }
  };
  const awardReward = async (userId, level) => {
    const rewards = {
      1: { type: 'coupon', value: '10OFF', points: 50, description: '10% Off Your Next Purchase!' },
      2: { type: 'content', value: 'Exclusive Brand Story Access', points: 100, description: 'Access to behind-the-scenes content!' },
      3: { type: 'social', value: 'Premium AR Filter Unlock', points: 150, description: 'Get a unique AR filter for your social posts!' },
      4: { type: 'referral', value: '25% Rebate Offer', points: 250, description: 'Get a 25% rebate on your next purchase by inviting a friend!' }
    };
    
    const reward = rewards[level];
    if (!reward) {
        console.error(`ScanPage: No reward defined for level ${level}`);
        return null;
    }

    // Update user points and level
    const { data, error } = await supabase.rpc('update_user_progress', {
      p_user_id: userId,
      p_points: reward.points,
      p_level: level
    });

    if (error) {
        console.error('ScanPage: Error updating user progress:', error);
        throw error;
    }
    console.log(`ScanPage: User progress updated for level ${level}. Points added: ${reward.points}`);
    
    return reward;
  };
  const completeSocialChallenge = async () => {
    console.log('ScanPage: Completing Social Challenge...');
    const reward = await awardReward(userData.id, 3);
    console.log('ScanPage: Level 3 Reward Awarded (Social Challenge):', reward);
    setStep('level-3-reward');
  };
  const completeReferralChallenge = async () => {
    console.log('ScanPage: Completing Referral Challenge...');
    const reward = await awardReward(userData.id, 4);
    console.log('ScanPage: Level 4 Reward Awarded (Referral Challenge):', reward);
    setStep('level-4-reward');
  };

  return (
    <div className="scan-container">
      {step === 'verifying' && <div className="loader">Verifying QR code...</div>}
      {step === 'location-verification' && <div className="location-check"><h2>Location Verification</h2><p>Please allow location access to continue</p><p className="loading-message">Checking your proximity to the QR code...</p></div>}
      {step === 'location-mismatch' && <div className="error-message"><h2>Location Mismatch!</h2><p>You must be within 100 meters of the QR code to participate.</p><button onClick={() => navigate('/')}>Return to Home</button></div>}
      {step === 'location-error' && <div className="error-message"><h2>Location Error!</h2><p>Could not get your location. Please ensure location services are enabled for your browser.</p><button onClick={() => navigate('/')}>Return to Home</button></div>}
      {step === 'invalid-signature' && <div className="error-message"><h2>Invalid QR Code!</h2><p>The QR code data is invalid or has been tampered with. Please scan an official Greenfield QR code.</p><button onClick={() => navigate('/')}>Return to Home</button></div>}
      {step === 'invalid-format' && <div className="error-message"><h2>Invalid QR Code Format!</h2><p>The QR code data is not in the expected format. Please scan an official Greenfield QR code.</p><button onClick={() => navigate('/')}>Return to Home</button></div>}
      {step === 'receipt-upload' && <div className="receipt-upload"><h2>Upload Your Receipt</h2><input type="file" accept="image/*" onChange={(e) => handleReceiptUpload(e.target.files[0])} /><p>Take a clear photo of your receipt showing the purchased item</p></div>}
      {step === 'processing-receipt' && <div className="loader"><h2>Processing Receipt...</h2><p>Please wait while we validate your purchase.</p></div>}
      {step === 'validation-failed' && <div className="error-message"><h2>Receipt Validation Failed</h2><p>We could not validate your receipt. Please ensure the item is visible and clearly pictured.</p><button onClick={() => setStep('receipt-upload')}>Try Again</button><button onClick={() => navigate('/')}>Return to Home</button></div>}
      {step === 'processing-error' && <div className="error-message"><h2>An Error Occurred</h2><p>There was an issue processing your request. Please try again later.</p><button onClick={() => navigate('/')}>Return to Home</button></div>}
      {step === 'authentication-required' && <div className="error-message"><h2>Authentication Required</h2><p>Please log in to claim your rewards.</p><button onClick={() => navigate('/auth')}>Go to Login</button></div>}
      {step === 'level-1-reward' && <RewardUnlock level={1} reward={{ type: 'coupon', value: '10% Off Next Purchase', description: 'Your coupon code: FIRSTSCAN10' }} onContinue={() => setStep('level-2-challenge')} />}
      {step === 'level-2-challenge' && <VideoExperience videoId="brand-story-123" onComplete={() => setStep('level-2-reward')} />}
      {step === 'level-2-reward' && <RewardUnlock level={2} reward={{ type: 'content', value: 'Exclusive Brand Story Access', description: 'You now have access to our behind-the-scenes content library!' }} onContinue={() => setStep('level-3-challenge')} />}
      {step === 'level-3-challenge' && <SocialChallenge campaign={campaign} onComplete={completeSocialChallenge} />}
      {step === 'level-3-reward' && <RewardUnlock level={3} reward={{ type: 'social', value: 'Premium AR Filter Unlock', description: 'A unique AR filter has been added to your profile!' }} onContinue={() => setStep('level-4-challenge')} />}
      {step === 'level-4-challenge' && <ReferralProgram user={userData} onComplete={completeReferralChallenge} />}
      {step === 'level-4-reward' && <RewardUnlock level={4} reward={{ type: 'referral', value: '25% Rebate Offer', description: 'Check your profile for details on how to claim your rebate!' }} onContinue={() => navigate('/profile')} />}
    </div>
  );
};

// Helper functions for parsing receipt text
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
  const itemRegex = /(.+?)\s+(\d+\.\d{2})/g;
  const items = [];
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({ name: match[1].trim(), price: parseFloat(match[2]) });
  }
  return items;
};
const extractTotal = (text) => {
  const totalRegex = /total\s+(\d+\.\d{2})/i;
  const match = text.match(totalRegex);
  return match ? parseFloat(match[1]) : 0;
};

// --- UPDATED AND CORRECTED SIGNATURE FUNCTION ---
const createHmacSignature = (secretKey, data) => {
  // This uses the crypto-js library to perform a real HMAC-SHA256 hash.
  // It correctly handles a passphrase-style secret key.
  const signature = CryptoJS.HmacSHA256(data, secretKey);
  return signature.toString(CryptoJS.enc.Hex);
};

export default ScanPage;