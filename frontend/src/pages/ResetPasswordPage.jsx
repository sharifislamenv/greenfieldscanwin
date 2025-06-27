//D:\MyProjects\greenfield-scanwin\frontend\src\pages\ResetPasswordPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './ResetPasswordPage.css'; // New dedicated CSS file

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    number: false,
    specialChar: false
  });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check password strength
  useEffect(() => {
    const requirements = {
      length: newPassword.length >= 8,
      number: /\d/.test(newPassword),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    };
    setPasswordRequirements(requirements);
  }, [newPassword]);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Extract access token from URL if present
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Set the session using the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) throw error;
          setIsTokenValid(true);
        } else {
          throw new Error('Missing token parameters');
        }
      } catch (error) {
        setMessage({ 
          type: 'error', 
          text: 'Invalid or expired password reset link. Please request a new one.' 
        });
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    // Validate password strength
    if (!passwordRequirements.length || !passwordRequirements.number || !passwordRequirements.specialChar) {
      setMessage({ 
        type: 'error', 
        text: 'Password must be at least 8 characters long and contain a number and special character' 
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Password updated successfully! Redirecting to login...' 
      });

      // Sign out and redirect after success
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login', { state: { fromPasswordReset: true } });
      }, 3000);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update password. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading-spinner"></div>
          <h2>Verifying your reset link...</h2>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <h2>Invalid Password Reset Link</h2>
          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}
          <div className="action-links">
            <button 
              onClick={() => navigate('/forgot-password')}
              className="secondary-button"
            >
              Request New Reset Link
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="primary-button"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <h2>Set a New Password</h2>
        
        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleSetNewPassword}>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="password-strength">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={passwordRequirements.length ? 'valid' : ''}>
                At least 8 characters
              </li>
              <li className={passwordRequirements.number ? 'valid' : ''}>
                Contains a number
              </li>
              <li className={passwordRequirements.specialChar ? 'valid' : ''}>
                Contains a special character
              </li>
            </ul>
          </div>

          <button 
            type="submit" 
            className="primary-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;