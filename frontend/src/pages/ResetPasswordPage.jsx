//D:\MyProjects\greenfield-scanwin\frontend\src\pages\ResetPasswordPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AuthPage.css'; // Reusing auth styles for consistency

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isTokenValid, setIsTokenValid] = useState(false);
  const navigate = useNavigate();

  // This hook runs once when the component loads to verify the token from the URL.
  useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setIsTokenValid(true);
      setLoading(false);
    }
  });

  return () => {
    subscription?.unsubscribe();
  };
  }, []);

    // A fallback timer in case the event doesn't fire (e.g., bad or expired link).
    const timer = setTimeout(() => {
        if (loading) {
            setLoading(false);
            if (!isTokenValid) {
                setMessage({ type: 'error', text: 'Invalid or expired password reset link.' });
            }
        }
    }, 4000);

    // Cleanup the listener when the component unmounts
    return () => {
      subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, []); // The empty array [] ensures this runs only once

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // The user is already authenticated via the token, so we can update the password.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Password updated successfully! Redirecting to login...' 
      });

      // Redirect to the login page after a short delay
      setTimeout(() => navigate('/auth'), 3000);

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Render a loading state while verifying the link
  if (loading) {
    return <div className="auth-page"><h2>Verifying link...</h2></div>;
  }
  
  // Render an error state if the link was invalid
  if (!isTokenValid) {
    return (
        <div className="auth-page">
            <h2>Invalid Link</h2>
            {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
            <div className="auth-switch">
                <p><button onClick={() => navigate('/auth')}>Return to Login</button></p>
            </div>
        </div>
    );
  }

  // Render the password update form if the link was valid
  return (
    <div className="auth-page">
      <h2>Set a New Password</h2>
      
      {message.text && (
        <div className={`auth-message ${message.type}`}>
          {message.text}
        </div>
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