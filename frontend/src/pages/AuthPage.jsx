//D:\MyProjects\greenfield-scanwin\frontend\src\pages\AuthPage.jsx

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
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setMessage({ 
          type: 'success', 
          text: `Success! Please check ${email} to confirm your account.` 
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message.includes('Invalid login credentials') 
          ? 'Invalid email or password' 
          : error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address to receive a reset link.' });
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
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
        {mode === 'login' ? 'Login' : 'Create Account'}
      </h2>
      
      {message.text && (
        <div className={`auth-message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleAuth}>
        <div className="form-group">
          <label>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            placeholder="At least 6 characters"
          />
        </div>
        
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
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={loading}
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </form>
      
      <div className="auth-switch">
        {mode === 'login' ? (
          <>
            <p>
              Don't have an account?{' '}
              <button 
                onClick={() => { 
                  setMode('signup'); 
                  setMessage({type:'', text:''}); 
                }}
                className="auth-link-button"
              >
                Sign Up
              </button>
            </p>
            <p>
              Forgot password?{' '}
              <button 
                onClick={handlePasswordReset}
                className="auth-link-button"
              >
                Reset Password
              </button>
            </p>
          </>
        ) : (
          <p>
            Already have an account?{' '}
            <button 
              onClick={() => { 
                setMode('login'); 
                setMessage({type:'', text:''}); 
              }}
              className="auth-link-button"
            >
              Login
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;