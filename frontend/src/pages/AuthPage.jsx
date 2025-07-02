//D:\MyProjects\greenfield-scanwin\frontend\src\pages\AuthPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AuthPage.css';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        setTimeout(() => navigate('/'), 1500);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: `Success! Please check ${email} to confirm your account.` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h2>{mode === 'login' ? 'Login' : 'Create Account'}</h2>
      {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
      <form onSubmit={handleAuth}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
        </div>
        {mode === 'signup' && (
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength="6" />
          </div>
        )}
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? <span className="spinner"></span> : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>
      <div className="auth-switch">
        {mode === 'login' ? (
          <>
            <p>Don't have an account? <button onClick={() => { setMode('signup'); setMessage({type:'', text:''}); }}>Sign Up</button></p>
            <p>Forgot password? <button onClick={() => navigate('/reset')}>Reset Password</button></p>
          </>
        ) : (
          <p>Already have an account? <button onClick={() => { setMode('login'); setMessage({type:'', text:''}); }}>Login</button></p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;