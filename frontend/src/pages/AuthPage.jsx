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
        
        // Create user with additional metadata
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              points: 0,
              level: 1,
              badges: []
            }
          }
        });
        
        if (error) throw error;
        
        // Create user profile in public.users table
        if (data.user) {
          await supabase
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              points: 0,
              level: 1,
              badges: [],
              scans_today: 0
            }]);
        }
        
        setMessage({ 
          type: 'success', 
          text: `Success! Please check ${email} to confirm your account.` 
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      let errorMsg = error.message;
      
      if (error.message.includes('User already registered')) {
        errorMsg = 'An account with this email already exists.';
      } else if (error.message.includes('Database error')) {
        errorMsg = 'We encountered an issue creating your account. Please try again.';
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMsg
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
      <div className="auth-container">
        <h2>
          {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login' 
            ? 'Login to access your rewards and scanning history' 
            : 'Join our community to start earning points'}
        </p>
        
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
              placeholder="your@email.com"
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
                placeholder="Confirm your password"
              />
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : mode === 'login' ? (
              'Login'
            ) : (
              'Create Account'
            )}
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
    </div>
  );
};

export default AuthPage;