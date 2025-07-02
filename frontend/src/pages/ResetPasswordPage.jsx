//D:\MyProjects\greenfield-scanwin\frontend\src\pages\ResetPasswordPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AuthPage.css';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowUpdateForm(true);
      }
    });
    setLoading(false);

    return () => subscription?.unsubscribe();
  }, []);

  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://greenfieldscanwin.vercel.app/reset',
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password reset email sent! Please check your inbox.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password updated successfully! Redirecting to login...' });
      setTimeout(() => navigate('/auth'), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="auth-page"><h2>Loading...</h2></div>;
  }
  
  if (showUpdateForm) {
    return (
      <div className="auth-page">
        <h2>Set a New Password</h2>
        {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
        <form onSubmit={handleSetNewPassword}>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="6" />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h2>Reset Password</h2>
      <p>Enter your email address to receive a password reset link.</p>
      {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
      <form onSubmit={handlePasswordResetRequest}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      <div className="auth-switch">
        <p><button onClick={() => navigate('/auth')}>Return to Login</button></p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;