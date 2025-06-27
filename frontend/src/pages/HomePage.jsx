//D:\MyProjects\greenfield-scanwin\frontend\src\pages\HomePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FacebookShareButton, TwitterShareButton, WhatsappShareButton } from 'react-share';
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
  const [userStats, setUserStats] = useState({ 
    points: 0, 
    level: 1, 
    badges: [],
    scansToday: 0
  });
  
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  
  const [analytics, setAnalytics] = useState({ 
    scans: 0, 
    shares: 0, 
    redemptions: 0,
    chartData: {
      options: {
        chart: { 
          id: 'activity-chart',
          toolbar: { show: false }
        },
        colors: ['#4CAF50', '#2196F3'],
        xaxis: { 
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          labels: { style: { colors: '#666' } }
        },
        yaxis: { labels: { style: { colors: '#666' } } },
        grid: { borderColor: '#f0f0f0' },
        dataLabels: { enabled: false },
        plotOptions: { bar: { borderRadius: 4 } }
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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setDataError('Failed to check user session');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // Fetch user data when authenticated
  const fetchUserData = async (userId) => {
    try {
      const { data: stats, error } = await supabase
        .from('users')
        .select('points, level, badges, scans_today')
        .eq('id', userId)
        .single();
      
      if (error) throw error;

      if (stats) {
        setUserStats({
          points: stats.points || 0,
          level: stats.level || 1,
          badges: stats.badges || [],
          scansToday: stats.scans_today || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setDataError('Failed to load user data');
    }
  };

  // Fetch public data regardless of auth state
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setIsLoading(true);
        setDataError(null);
        const today = new Date().toISOString();
        
        // Active campaigns (current date between start and end dates)
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .lte('start_date', today)
          .gte('end_date', today)
          .order('end_date', { ascending: true });
        
        if (campaignsError) throw campaignsError;
        setActiveCampaigns(campaigns || []);
        
        // Leaderboard - use the materialized view directly
        const { data: leaderboardData, error: leaderboardError } = await supabase
          .from('leaderboard')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(10);
        
        if (leaderboardError) throw leaderboardError;
        setLeaderboard(leaderboardData || []);
        
        // Analytics - use count with error handling
        const { count: scans, error: scansError } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true });
        
        if (scansError) throw scansError;
        
        const { count: shares, error: sharesError } = await supabase
          .from('social_shares')
          .select('*', { count: 'exact', head: true });
        
        if (sharesError) throw sharesError;
        
        const { count: redemptions, error: redemptionsError } = await supabase
          .from('user_rewards')
          .select('*', { count: 'exact', head: true });
        
        if (redemptionsError) throw redemptionsError;
        
        // Get chart data with error handling
        const { data: scanData, error: scanDataError } = await supabase.rpc('get_weekly_scan_data');
        if (scanDataError) throw scanDataError;
        
        const { data: shareData, error: shareDataError } = await supabase.rpc('get_weekly_share_data');
        if (shareDataError) throw shareDataError;
        
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
        setDataError('Failed to load public data');
        // Set default/empty values if there's an error
        setActiveCampaigns([]);
        setLeaderboard([]);
        setAnalytics(prev => ({
          ...prev,
          scans: 0,
          shares: 0,
          redemptions: 0,
          chartData: {
            ...prev.chartData,
            series: [
              { name: 'Scans', data: [0,0,0,0,0,0,0] },
              { name: 'Shares', data: [0,0,0,0,0,0,0] }
            ]
          }
        }));
      } finally {
        setIsLoading(false);
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
        await fetchUserData(user.id);
      } else {
        // Sign up user
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              points: 0,
              level: 1
            }
          }
        });
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
    setUserStats({ points: 0, level: 1, badges: [], scansToday: 0 });
    setAuthSuccess('You have been logged out');
  };

  // Handle scanning
  const handleStartScanning = () => {
    navigate('/start-scan');
  };

  const simulateScan = async () => {
    if (!user) return;
    
    setScanStatus('scanning');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user stats
      const { data, error } = await supabase
        .from('users')
        .update({ 
          points: userStats.points + 10,
          scans_today: userStats.scansToday + 1
        })
        .eq('id', user.id)
        .select();
      
      if (error) throw error;

      if (data) {
        setUserStats(prev => ({
          ...prev,
          points: prev.points + 10,
          scansToday: prev.scansToday + 1
        }));
        
        setScanStatus('success');
        setTimeout(() => setScanStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 3000);
    }
  };

  const handleSocialShare = async (platform) => {
    try {
      // Record share in database
      if (user) {
        const { error } = await supabase
          .from('social_shares')
          .insert({ user_id: user.id, platform });
        
        if (error) throw error;
      }
      
      console.log(`Shared on ${platform}`);
    } catch (error) {
      console.error('Error recording share:', error);
    }
  };

  const renderLevelProgress = () => {
    const progress = ((userStats.level % 4) / 4) * 100;
    return (
      <div className="level-progress">
        <div className="level-bar" style={{ width: `${progress}%` }}></div>
        <div className="level-text">Level {userStats.level} ({progress.toFixed(0)}%)</div>
      </div>
    );
  };

  const renderCampaignCard = (campaign) => (
    <div key={campaign.id} className="campaign-card">
      <div className={`campaign-badge ${campaign.type.toLowerCase()}`}>
        {campaign.type}
      </div>
      <h3>{campaign.name}</h3>
      <p>{campaign.description}</p>
      <div className="campaign-dates">
        {new Date(campaign.start_date).toLocaleDateString()} -{' '}
        {new Date(campaign.end_date).toLocaleDateString()}
      </div>
      <div className="campaign-reward">
        Reward: {campaign.reward.value} {campaign.reward.type}
      </div>
      {user && (
        <button 
          className="campaign-button"
          onClick={() => navigate(`/campaign/${campaign.id}`)}
        >
          View Details
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="nav-logo" onClick={() => window.scrollTo(0, 0)}>
          <span className="logo-icon">🌿</span> Greenfield Scan & Win
        </div>
        <div className="nav-auth">
          {user ? (
            <div className="user-nav">
              <span className="user-email">{user.email}</span>
              <button className="nav-button" onClick={() => navigate('/profile')}>
                Profile
              </button>
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
            <div className="hero-actions">
              <button className="cta-button" onClick={handleStartScanning}>
                Start Scanning
              </button>
              <button 
                className="secondary-button"
                onClick={() => navigate('/rewards')}
              >
                View Rewards
              </button>
            </div>
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
          <div className="section-header">
            <h2>Your Progress</h2>
            <button 
              className="view-all"
              onClick={() => navigate('/profile')}
            >
              View Full Profile
            </button>
          </div>
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
            <div className="stat-card">
              <div className="stat-value">{userStats.scansToday}</div>
              <div className="stat-label">Today's Scans</div>
            </div>
          </div>
          
          {renderLevelProgress()}
          
          <div className="badges-container">
            <h3>Recent Badges</h3>
            {userStats.badges.length > 0 ? (
              <div className="badges-grid">
                {userStats.badges.slice(0, 3).map((badge, index) => (
                  <div key={index} className="badge-item">
                    <div className="badge-icon">🏆</div>
                    <div className="badge-name">{badge}</div>
                  </div>
                ))}
                {userStats.badges.length > 3 && (
                  <button 
                    className="view-more"
                    onClick={() => navigate('/profile')}
                  >
                    +{userStats.badges.length - 3} more
                  </button>
                )}
              </div>
            ) : (
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
              {scanStatus === 'idle' && (
                <>
                  <div className="scan-instruction">Point camera at QR code</div>
                  <div className="qr-guide"></div>
                </>
              )}
              {scanStatus === 'scanning' && <div className="scanning-animation"></div>}
              {scanStatus === 'success' && (
                <div className="scan-success">
                  <div className="success-icon">✓</div>
                  <div>+10 Points!</div>
                  <div className="success-message">Scan Successful!</div>
                </div>
              )}
              {scanStatus === 'error' && (
                <div className="scan-error">
                  <div className="error-icon">✗</div>
                  <div className="error-message">Scan Failed. Try Again.</div>
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
            <p className="scan-tip">
              Scan QR codes on Greenfield products in-store to unlock rewards. 
              Earn 10 points per scan!
            </p>
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="campaigns-section">
        <div className="section-header">
          <h2>Active Campaigns</h2>
          <button 
            className="view-all"
            onClick={() => navigate('/campaigns')}
          >
            View All Campaigns
          </button>
        </div>
        {dataError && (
          <div className="error-message">
            Error loading campaigns: {dataError}
          </div>
        )}
        <div className="campaigns-grid">
          {activeCampaigns.length > 0 ? (
            activeCampaigns.slice(0, 3).map(renderCampaignCard)
          ) : (
            <p>No active campaigns at the moment. Check back soon!</p>
          )}
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="leaderboard-section">
        <div className="section-header">
          <h2>Top Participants</h2>
          <button 
            className="view-all"
            onClick={() => navigate('/leaderboard')}
          >
            View Full Leaderboard
          </button>
        </div>
        {dataError && (
          <div className="error-message">
            Error loading leaderboard: {dataError}
          </div>
        )}
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
                <tr 
                  key={entry.id} 
                  className={index === 0 ? 'top-player' : ''}
                  onClick={() => user && navigate(`/profile/${entry.id}`)}
                >
                  <td>{index + 1}</td>
                  <td>
                    {entry.email.split('@')[0]}
                    {index === 0 && <span className="crown-icon">👑</span>}
                  </td>
                  <td>{entry.total_points}</td>
                  <td>{entry.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="analytics-section">
        <h2>Community Analytics</h2>
        {dataError && (
          <div className="error-message">
            Error loading analytics: {dataError}
          </div>
        )}
        <div className="analytics-grid">
          <div className="metric-card">
            <div className="metric-value">{analytics.scans.toLocaleString()}</div>
            <div className="metric-label">Total Scans</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{analytics.shares.toLocaleString()}</div>
            <div className="metric-label">Social Shares</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{analytics.redemptions.toLocaleString()}</div>
            <div className="metric-label">Rewards Redeemed</div>
          </div>
        </div>
        
        <div className="analytics-chart">
          <Chart
            options={analytics.chartData.options}
            series={analytics.chartData.series}
            type="bar"
            height={350}
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
              quote={`I've earned ${userStats.points} points on Greenfield Scan & Win! Join me in this exciting challenge.`}
              hashtag="#GreenfieldScanWin"
              onClick={() => handleSocialShare('facebook')}
            >
              <button className="social-button facebook">
                <span className="icon">👍</span> Share on Facebook
              </button>
            </FacebookShareButton>
            
            <TwitterShareButton
              url={window.location.href}
              title={`I'm at level ${userStats.level} with ${userStats.points} points on @Greenfield's Scan & Win! #GreenfieldScanWin`}
              onClick={() => handleSocialShare('twitter')}
            >
              <button className="social-button twitter">
                <span className="icon">🐦</span> Share on Twitter
              </button>
            </TwitterShareButton>
            
            <WhatsappShareButton
              url={window.location.href}
              title={`Join me on Greenfield Scan & Win! I've already earned ${userStats.points} points.`}
              onClick={() => handleSocialShare('whatsapp')}
            >
              <button className="social-button whatsapp">
                <span className="icon">💬</span> Share on WhatsApp
              </button>
            </WhatsappShareButton>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer">
        <div className="footer-links">
          <button onClick={() => navigate('/about')}>About Us</button>
          <button onClick={() => navigate('/terms')}>Terms</button>
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          <button onClick={() => navigate('/contact')}>Contact</button>
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} Greenfield. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default HomePage;