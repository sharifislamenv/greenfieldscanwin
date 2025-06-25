//D:\MyProjects\greenfield-scanwin\frontend\src\pages\ResetPasswordPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AuthPage.css';

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isTokenValid, setIsTokenValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase automatically detects the session from the URL hash.
    // We listen for the PASSWORD_RECOVERY event to confirm success.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsTokenValid(true);
        setLoading(false);
      }
    });

    // A fallback timer in case the event doesn't fire (e.g., bad link)
    const timer = setTimeout(() => {
        if (loading) {
            setLoading(false);
            if (!isTokenValid) {
                setMessage({ type: 'error', text: 'Invalid or expired password reset link.' });
            }
        }
    }, 3000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, [loading, isTokenValid]);

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // The user is already authenticated via the token at this point.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Password updated successfully! Redirecting to login...' 
      });

      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, 3000);

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="auth-page"><h2>Verifying link...</h2></div>;
  }
  
  if (!isTokenValid) {
    return (
        <div className="auth-page">
            <h2>Invalid Link</h2>
            {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
            <div className="auth-switch">
                <p>
                    <button onClick={() => navigate('/auth')}>Return to Login</button>
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="auth-page">
      <h2>Set a New Password</h2>
      
      {message.text && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}
      
      <form onSubmit={handleSetNewPassword}>
        <div className="form-group">
          <label>New Password</label>
          <input 
            type="password"
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="6"
          />
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;