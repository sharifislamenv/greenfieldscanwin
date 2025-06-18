//D:\MyProjects\greenfield-scanwin\frontend\src\pages\HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FacebookShareButton, TwitterShareButton } from 'react-share';
import Chart from 'react-apexcharts';
import './HomePage.css';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState({ points: 0, level: 1, badges: [] });
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [analytics, setAnalytics] = useState({ scans: 0, shares: 0, redemptions: 0 });
  const [scanStatus, setScanStatus] = useState('idle');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get user stats
        const { data: stats } = await supabase
          .from('users')
          .select('points, level, badges')
          .eq('id', user.id)
          .single();
        
        if (stats) setUserStats(stats);
        
        // Get active campaigns
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('*')
          .gte('end_date', new Date().toISOString());
        
        setActiveCampaigns(campaigns || []);
        
        // Get top 5 leaderboard
        const { data: leaderboardData } = await supabase
          .from('leaderboard')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(5);
        
        setLeaderboard(leaderboardData || []);
        
        // Get analytics
        const { count: scans } = await supabase
          .from('scans')
          .select('*', { count: 'exact' });
        
        const { count: shares } = await supabase
          .from('social_shares')
          .select('*', { count: 'exact' });
        
        const { count: redemptions } = await supabase
          .from('user_rewards')
          .select('*', { count: 'exact' });
        
        setAnalytics({
          scans: scans || 0,
          shares: shares || 0,
          redemptions: redemptions || 0
        });
      }
    };
    
    fetchData();
  }, []);

  const handleStartScanning = () => {
    if (user) {
      navigate('/scan');
    } else {
      navigate('/auth');
    }
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
    // In a real app, this would trigger actual social sharing
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
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Greenfield Scan & Win</h1>
          <p>Scan QR codes in-store to unlock exclusive rewards and experiences!</p>
          <button className="cta-button" onClick={handleStartScanning}>
            {user ? 'Start Scanning' : 'Get Started'}
          </button>
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
              disabled={scanStatus === 'scanning'}
            >
              {scanStatus === 'scanning' ? 'Scanning...' : 'Scan QR Code'}
            </button>
            <p className="scan-tip">Scan QR codes on Greenfield products in-store to unlock rewards</p>
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
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

      {/* Leaderboard Section */}
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

      {/* Analytics Section */}
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
            options={{
              chart: { id: 'activity-chart' },
              xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
            }}
            series={[
              { name: 'Scans', data: [30, 40, 45, 50, 49, 60, 70] },
              { name: 'Shares', data: [15, 20, 35, 25, 40, 45, 50] }
            ]}
            type="bar"
            height={300}
          />
        </div>
      </div>

      {/* Social Sharing Section */}
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
    </div>
  );
};

export default HomePage;