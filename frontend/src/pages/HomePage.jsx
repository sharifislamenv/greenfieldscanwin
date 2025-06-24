//D:\MyProjects\greenfield-scanwin\frontend\src\pages\HomePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FacebookShareButton, TwitterShareButton } from 'react-share';
import Chart from 'react-apexcharts';
import './HomePage.css';

const HomePage = () => {
  // Authentication states
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // App states
  const [userStats, setUserStats] = useState({ points: 0, level: 1, badges: [] });
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [analytics, setAnalytics] = useState({ 
    scans: 0, 
    shares: 0, 
    redemptions: 0,
    chartData: {
      options: {
        chart: { id: 'activity-chart' },
        xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
      },
      series: [
        { name: 'Scans', data: [0,0,0,0,0,0,0] },
        { name: 'Shares', data: [0,0,0,0,0,0,0] }
      ]
    }
  });
  
  const [scanStatus, setScanStatus] = useState('idle');
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchUserData(session.user.id);
      }
    };
    
    checkSession();
  }, []);

  // Fetch user data when authenticated
  const fetchUserData = async (userId) => {
    const { data: stats } = await supabase
      .from('users')
      .select('points, level, badges')
      .eq('id', userId)
      .single();
    
    if (stats) setUserStats(stats);
  };

  // Fetch public data regardless of auth state
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const today = new Date().toISOString();
        
        // Active campaigns (current date between start and end dates)
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today);
        
        setActiveCampaigns(campaigns || []);
        
        // Leaderboard (only show users with points)
        const { data: leaderboardData } = await supabase
          .from('leaderboard')
          .select('*')
          .gt('total_points', 0)
          .order('total_points', { ascending: false })
          .limit(5);
        
        setLeaderboard(leaderboardData || []);
        
        // Analytics
        const { count: scans } = await supabase
          .from('scans')
          .select('*', { count: 'exact' });
        
        const { count: shares } = await supabase
          .from('social_shares')
          .select('*', { count: 'exact' });
        
        const { count: redemptions } = await supabase
          .from('user_rewards')
          .select('*', { count: 'exact' });
        
        // Get chart data
        const { data: scanData } = await supabase.rpc('get_weekly_scan_data');
        const { data: shareData } = await supabase.rpc('get_weekly_share_data');
        
        setAnalytics(prev => ({
          ...prev,
          scans: scans || 0,
          shares: shares || 0,
          redemptions: redemptions || 0,
          chartData: {
            ...prev.chartData,
            series: [
              { name: 'Scans', data: scanData || [0,0,0,0,0,0,0] },
              { name: 'Shares', data: shareData || [0,0,0,0,0,0,0] }
            ]
          }
        }));
      } catch (error) {
        console.error('Error fetching public data:', error);
      }
    };
    
    fetchPublicData();
  }, []);

  // Handle authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      // Form validation
      if (authMode === 'signup' && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (authMode === 'login') {
        // Login user
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        setAuthSuccess('Login successful!');
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        fetchUserData(user.id);
      } else {
        // Sign up user
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        setAuthSuccess(`Success! Check ${email} for confirmation.`);
        setAuthMode('login');
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserStats({ points: 0, level: 1, badges: [] });
    setAuthSuccess('You have been logged out');
  };

  // Handle scanning
  const handleStartScanning = () => {
    navigate('/scan');
  };

  const simulateScan = () => {
    setScanStatus('scanning');
    setTimeout(() => {
      setScanStatus('success');
      setTimeout(() => setScanStatus('idle'), 3000);
    }, 2000);
  };

  const handleSocialShare = (platform) => {
    console.log(`Shared on ${platform}`);
  };

  const renderLevelProgress = () => {
    const progress = (userStats.level / 4) * 100;
    return (
      <div className="level-progress">
        <div className="level-bar" style={{ width: `${progress}%` }}></div>
        <div className="level-text">Level {userStats.level}/4</div>
      </div>
    );
  };

  const renderCampaignCard = (campaign) => (
    <div key={campaign.id} className="campaign-card">
      <div className="campaign-badge">{campaign.type}</div>
      <h3>{campaign.name}</h3>
      <p>{campaign.description}</p>
      <div className="campaign-dates">
        {new Date(campaign.start_date).toLocaleDateString()} - 
        {new Date(campaign.end_date).toLocaleDateString()}
      </div>
      <div className="campaign-reward">
        Reward: {campaign.reward.value}
      </div>
    </div>
  );

  return (
    <div className="home-page">
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="nav-logo">Greenfield Scan & Win</div>
        <div className="nav-auth">
          {user ? (
            <div className="user-nav">
              <span className="user-email">{user.email}</span>
              <button className="nav-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-toggle">
              <button 
                className={`nav-button ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button 
                className={`nav-button ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Scan QR Codes, Win Rewards</h1>
          <p>Discover exclusive offers and experiences within the Greenfield Ecosystem!</p>
          
          {user ? (
            <button className="cta-button" onClick={handleStartScanning}>
              Start Scanning
            </button>
          ) : (
            <div className="auth-container">
              <h2>{authMode === 'login' ? 'Login to Your Account' : 'Create Account'}</h2>
              
              {authError && <div className="auth-message error">{authError}</div>}
              {authSuccess && <div className="auth-message success">{authSuccess}</div>}
              
              <form onSubmit={handleAuth}>
                <div className="form-group">
                  <input 
                    type="email" 
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <input 
                    type="password" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                </div>
                
                {authMode === 'signup' && (
                  <div className="form-group">
                    <input 
                      type="password" 
                      placeholder="Confirm password"
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
                  disabled={isAuthLoading}
                >
                  {isAuthLoading ? (
                    <span className="spinner"></span>
                  ) : authMode === 'login' ? (
                    'Login'
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </form>
              
              <div className="auth-footer">
                {authMode === 'login' ? (
                  <>
                    <p>
                      Don't have an account?{' '}
                      <button onClick={() => setAuthMode('signup')}>Sign Up</button>
                    </p>
                    <p className="password-reset">
                      Forgot password?{' '}
                      <button onClick={() => navigate('/reset')}>Reset Password</button>
                    </p>
                  </>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button onClick={() => setAuthMode('login')}>Login</button>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="hero-image">
          <div className="qr-code-placeholder"></div>
          <div className="scan-animation"></div>
        </div>
      </div>

      {/* User Stats Section */}
      {user && (
        <div className="stats-section">
          <h2>Your Progress</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{userStats.points}</div>
              <div className="stat-label">Points</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.badges.length}</div>
              <div className="stat-label">Badges</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{userStats.level}</div>
              <div className="stat-label">Level</div>
            </div>
          </div>
          
          {renderLevelProgress()}
          
          <div className="badges-container">
            {userStats.badges.map((badge, index) => (
              <div key={index} className="badge-item">
                <div className="badge-icon">🏆</div>
                <div className="badge-name">{badge}</div>
              </div>
            ))}
            {userStats.badges.length === 0 && (
              <p>Complete challenges to earn badges!</p>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner Section */}
      <div className="scanner-section">
        <h2>Scan & Win</h2>
        <div className="scanner-container">
          <div className={`scanner-ui ${scanStatus}`}>
            <div className="scanner-frame">
              {scanStatus === 'idle' && <div className="scan-instruction">Point camera at QR code</div>}
              {scanStatus === 'scanning' && <div className="scanning-animation"></div>}
              {scanStatus === 'success' && (
                <div className="scan-success">
                  <div className="success-icon">✓</div>
                  <div>Scan Successful!</div>
                </div>
              )}
            </div>
          </div>
          
          <div className="scanner-controls">
            <button 
              className={`scan-button ${scanStatus === 'scanning' ? 'scanning' : ''}`}
              onClick={simulateScan}
              disabled={scanStatus === 'scanning' || !user}
            >
              {scanStatus === 'scanning' 
                ? 'Scanning...' 
                : user 
                  ? 'Scan QR Code' 
                  : 'Login to Scan'}
            </button>
            <p className="scan-tip">Scan QR codes on Greenfield products in-store to unlock rewards</p>
          </div>
        </div>
      </div>

      {/* Public Sections */}
      <div className="campaigns-section">
        <h2>Active Campaigns</h2>
        <div className="campaigns-grid">
          {activeCampaigns.length > 0 ? (
            activeCampaigns.map(renderCampaignCard)
          ) : (
            <p>No active campaigns at the moment. Check back soon!</p>
          )}
        </div>
      </div>

      <div className="leaderboard-section">
        <h2>Top Participants</h2>
        <div className="leaderboard-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Participant</th>
                <th>Points</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.id} className={index === 0 ? 'top-player' : ''}>
                  <td>{index + 1}</td>
                  <td>{entry.email}</td>
                  <td>{entry.total_points}</td>
                  <td>{entry.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="analytics-section">
        <h2>Campaign Analytics</h2>
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
        
        <div className="analytics-chart">
          <Chart
            options={analytics.chartData.options}
            series={analytics.chartData.series}
            type="bar"
            height={300}
          />
        </div>
      </div>

      {/* Social Sharing */}
      {user && (
        <div className="social-section">
          <h2>Share Your Progress</h2>
          <p>Share your achievements and invite friends to join the fun!</p>
          <div className="social-buttons">
            <FacebookShareButton
              url={window.location.href}
              quote={"I'm participating in Greenfield's Scan & Win challenge!"}
              onClick={() => handleSocialShare('facebook')}
            >
              <button className="social-button facebook">
                Share on Facebook
              </button>
            </FacebookShareButton>
            
            <TwitterShareButton
              url={window.location.href}
              title={"Join me in Greenfield's Scan & Win challenge! #GreenfieldLights"}
              onClick={() => handleSocialShare('twitter')}
            >
              <button className="social-button twitter">
                Share on Twitter
              </button>
            </TwitterShareButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;