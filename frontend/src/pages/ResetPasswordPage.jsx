//D:\MyProjects\greenfield-scanwin\frontend\src\pages\ResetPasswordPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AuthPage.css';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Password reset email sent! Check your inbox.' 
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2>Reset Password</h2>
      
      {message.text && (
        <div className={`auth-message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handlePasswordReset}>
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled极狐={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>
      
      <div className="auth-switch">
        <p>
          Remember your password?{' '}
          <button onClick={() => navigate('/auth')}>Login</button>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;