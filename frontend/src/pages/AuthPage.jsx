//D:\MyProjects\greenfield-scanwin\frontend\src\pages\AuthPage.jsx
import React, { useState, useEffect } from 'react';
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

  // Handle expired email links
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const error = params.get('error');
    const errorCode = params.get('error_code');
    
    if (error === 'access_denied' && errorCode === 'otp_expired') {
      setMessage({ 
        type: 'error', 
        text: 'Email link is invalid or has expired. Please login again.' 
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Login successful!' });
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ 
          type: 'success', 
          text: `Success! Check ${email} for confirmation.` 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
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
      <h2>
        {mode === 'login' ? 'Login' : 
         mode === 'signup' ? 'Create Account' : 
         'Reset Password'}
      </h2>
      
      {message.text && (
        <div className={`auth-message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={mode !== 'reset' ? handleAuth : (e) => e.preventDefault()}>
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        {mode !== 'reset' && (
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
        )}
        
        {mode === 'signup' && (
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
        )}
        
        {mode === 'reset' ? (
          <button 
            type="button" 
            className="auth-button"
            onClick={handlePasswordReset}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Email'}
          </button>
        ) : (
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        )}
      </form>
      
      <div className="auth-switch">
        {mode === 'login' ? (
          <>
            <p>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')}>Sign Up</button>
            </p>
            <p>
              Forgot password?{' '}
              <button onClick={() => setMode('reset')}>Reset Password</button>
            </p>
          </>
        ) : mode === 'signup' ? (
          <p>
            Already have an account?{' '}
            <button onClick={() => setMode('login')}>Login</button>
          </p>
        ) : (
          <p>
            Remember your password?{' '}
            <button onClick={() => setMode('login')}>Login</button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;