//D:\MyProjects\greenfield-scanwin\frontend\src\components\ReferralProgram.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './ReferralProgram.css';

const ReferralProgram = ({ user, onComplete }) => {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generateReferralCode = useCallback(async () => {
    if (!user) return;
    try {
      const code = `GREEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { error } = await supabase
        .from('users')
        .update({ referral_code: code })
        .eq('id', user.id);
      if (error) throw error;
      setReferralCode(code);
    } catch (err) {
      console.error("Error generating referral code:", err);
      setError("Could not generate a referral code. Please try again.");
    }
  }, [user]);

  useEffect(() => {
    if (user?.referral_code) {
      setReferralCode(user.referral_code);
    } else {
      generateReferralCode();
    }
  }, [user, generateReferralCode]);

  const copyToClipboard = () => {
    const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="referral-program">
      <h2>Level 4: Referral Challenge</h2>
      <p>Invite friends to earn bonus rewards!</p>
      {error && <p className="error-message">{error}</p>}
      <div className="referral-card">
        <h3>Your Unique Referral Code</h3>
        <div className="referral-code">{referralCode || 'Generating...'}</div>
      </div>
      <div className="referral-instructions">
        <p>Share this link with your friends:</p>
        <div className="referral-link">
          <button onClick={copyToClipboard}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
      <button className="complete-button" onClick={onComplete} disabled={!referralCode}>
        Continue
      </button>
    </div>
  );
};

export default ReferralProgram;