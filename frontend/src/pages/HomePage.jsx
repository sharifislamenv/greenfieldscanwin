//D:\MyProjects\greenfield-scanwin\frontend\src\pages\HomePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useCampaigns } from '../contexts/CampaignContext';
import CampaignCard from '../components/CampaignCard';
import Chart from 'react-apexcharts';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  // 1. Get all necessary data and, crucially, the loading states from contexts
  const { user, userStats, isLoading: isUserLoading } = useUser();
  const { activeCampaigns, isLoading: isCampaignsLoading } = useCampaigns();

  // 2. Local state for the auth form and public data
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isPublicDataLoading, setIsPublicDataLoading] = useState(true);

  // 3. This useEffect now only fetches data that is public and not in a context
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [leaderboardRes, scansRes, sharesRes, rewardsRes] = await Promise.all([
          supabase.from('leaderboard').select('*').gt('total_points', 0).limit(5),
          supabase.from('scans').select('*', { count: 'exact' }),
          supabase.from('social_shares').select('*', { count: 'exact' }),
          supabase.from('user_rewards').select('*', { count: 'exact' })
        ]);

        if (leaderboardRes.error) throw leaderboardRes.error;
        if (scansRes.error) throw scansRes.error;
        if (sharesRes.error) throw sharesRes.error;
        if (rewardsRes.error) throw rewardsRes.error;
        
        setLeaderboard(leaderboardRes.data || []);
        setAnalytics({
          scans: scansRes.count || 0,
          shares: sharesRes.count || 0,
          redemptions: rewardsRes.count || 0,
        });

      } catch (error) {
        console.error("Error fetching public data:", error);
      } finally {
        setIsPublicDataLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthMessage({ type: '', text: '' });
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // No need to redirect, the useUser context will update the state automatically
      } else {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthMessage({ type: 'success', text: 'Success! Please check your email to confirm your account.' });
      }
    } catch (error) {
      setAuthMessage({ type: 'error', text: error.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // --- THE FIX: The component is only considered "loading" if ANY of its data sources are still loading. ---
  if (isUserLoading || isCampaignsLoading || isPublicDataLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Greenfield...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <header className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>Greenfield Scan & Win</div>
        {user && (
            <div className='user-nav'>
                <span className="user-email" onClick={() => navigate('/profile')}>{user.email}</span>
                <button className="nav-button" onClick={() => supabase.auth.signOut()}>Logout</button>
            </div>
        )}
      </header>
      
      <section className="hero-section">
        <div className="hero-content">
            <h1>Scan QR Codes, Win Rewards</h1>
            <p>Discover exclusive offers and experiences within the Greenfield Ecosystem!</p>
            {user ? (
                <button className="cta-button" onClick={() => navigate('/start-scan')}>Start Scanning</button>
            ) : (
                <div className="auth-container">
                    <h2>{authMode === 'login' ? 'Login to Your Account' : 'Create an Account'}</h2>
                    {authMessage.text && <div className={`auth-message ${authMessage.type}`}>{authMessage.text}</div>}
                    <form onSubmit={handleAuth}>
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                        {authMode === 'signup' && <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />}
                        <button type="submit" className="auth-button" disabled={isAuthLoading}>{isAuthLoading ? <span className="spinner"></span> : (authMode === 'login' ? 'Login' : 'Sign Up')}</button>
                    </form>
                    <div className="auth-switch">
                    {authMode === 'login' ? (
                        <>
                            <p>Don't have an account? <button onClick={() => setAuthMode('signup')}>Sign Up</button></p>
                            <p><button onClick={() => navigate('/reset')}>Forgot Password?</button></p>
                        </>
                    ) : (
                        <p>Already have an account? <button onClick={() => setAuthMode('login')}>Login</button></p>
                    )}
                    </div>
                </div>
            )}
        </div>
      </section>

      {user && userStats && (
        <section className="stats-section">
          <h2>Your Progress</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{userStats.points}</div>
              <div className="stat-label">Points</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.badges?.length || 0}</div>
              <div className="stat-label">Badges</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.level}</div>
              <div className="stat-label">Level</div>
            </div>
          </div>
        </section>
      )}

      {activeCampaigns.length > 0 && (
          <section className="campaigns-section">
              <h2>Active Campaigns</h2>
              <div className="campaigns-grid">
                  {activeCampaigns.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} />)}
              </div>
          </section>
      )}
      
      {analytics && (
        <section className="analytics-section">
          <h2>Community Analytics</h2>
          <div className="analytics-grid">
            <div className="metric-card">
              <div className="metric-value">{analytics.scans}</div>
              <div className="metric-label">Total Scans</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{analytics.shares}</div>
              <div className="metric-label">Social Shares</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{analytics.redemptions}</div>
              <div className="metric-label">Rewards Redeemed</div>
            </div>
          </div>
        </section>
      )}

      {leaderboard.length > 0 && (
        <section className="leaderboard-section">
          <h2>Top Participants</h2>
          <div className="leaderboard-container">
            <table className="leaderboard-table">
              <thead>
                <tr><th>Rank</th><th>Participant</th><th>Points</th><th>Level</th></tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>{entry.email}</td>
                    <td>{entry.total_points}</td>
                    <td>{entry.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;