//D:\MyProjects\greenfield-scanwin\frontend\src\components\ReferralProgram.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ReferralProgram = ({ user, onComplete }) => {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    if (user?.referral_code) {
      setReferralCode(user.referral_code);
    } else {
      generateReferralCode();
    }
  }, [user]);

  const generateReferralCode = async () => {
    if (!user) return;
    
    // Generate a unique referral code
    const code = `GREEN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Update user in database
    const { error } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', user.id);
    
    if (!error) {
      setReferralCode(code);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = () => {
    setSuccess(true);
    setTimeout(() => onComplete(), 2000);
  };

  return (
    <div className="referral-program">
      <h2>Level 4: Referral Challenge</h2>
      <p>Invite friends to earn bonus rewards!</p>
      
      <div className="referral-card">
        <h3>Your Unique Referral Code</h3>
        <div className="referral-code">{referralCode || 'Generating...'}</div>
        
        <div className="referral-stats">
          <div className="stat">
            <div className="stat-value">5</div>
            <div className="stat-label">Friends Invited</div>
          </div>
          <div className="stat">
            <div className="stat-value">$25</div>
            <div className="stat-label">Reward Value</div>
          </div>
        </div>
      </div>
      
      <div className="referral-instructions">
        <p>Share this link with your friends:</p>
        <div className="referral-link">
          {window.location.origin}/signup?ref={referralCode}
          <button onClick={copyToClipboard}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
      
      <button 
        className="complete-button"
        onClick={handleComplete}
        disabled={!referralCode}
      >
        Complete Challenge
      </button>
      
      {success && (
        <div className="success-message">
          ✓ Challenge completed! Bonus points added to your account
        </div>
      )}
    </div>
  );
};

export default ReferralProgram;