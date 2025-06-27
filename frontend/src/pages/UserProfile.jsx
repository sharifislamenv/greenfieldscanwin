//D:\MyProjects\greenfield-scanwin\frontend\src\pages\UserProfile.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Chart from 'react-apexcharts';
import './UserProfile.css';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    points: 0,
    level: 1,
    badges: [],
    scansToday: 0
  });
  const [rewards, setRewards] = useState([]);
  const [activityData, setActivityData] = useState({
    options: {
      chart: {
        id: 'user-activity',
        toolbar: { show: false }
      },
      colors: ['#4CAF50'],
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
      { name: 'Scans', data: [0, 0, 0, 0, 0, 0, 0] }
    ]
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          navigate('/login');
          return;
        }
        
        // Get profile data
        const { data: profileData } = await supabase
          .from('users')
          .select('points, level, badges, scans_today')
          .eq('id', authUser.id)
          .single();
        
        // Get available rewards
        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('*')
          .lte('required_points', profileData?.points || 0)
          .order('required_points', { ascending: true });
        
        // Get user activity
        const { data: activity } = await supabase.rpc('get_user_activity', {
          user_id: authUser.id
        });

        if (profileData) {
          setUser(authUser);
          setProfile({
            points: profileData.points || 0,
            level: profileData.level || 1,
            badges: profileData.badges || [],
            scansToday: profileData.scans_today || 0
          });
          setRewards(rewardsData || []);
          
          if (activity) {
            setActivityData(prev => ({
              ...prev,
              series: [{ name: 'Scans', data: activity }]
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);

  const handleRedeemReward = async (rewardId) => {
    try {
      const { error } = await supabase
        .from('user_rewards')
        .insert([{ 
          user_id: user.id, 
          reward_id: rewardId,
          redeemed_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      // Update points after redemption
      const reward = rewards.find(r => r.id === rewardId);
      const newPoints = profile.points - reward.required_points;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', user.id);
        
      if (!updateError) {
        setProfile(prev => ({ ...prev, points: newPoints }));
        setRewards(prev => prev.filter(r => r.id !== rewardId));
        setMessage({ type: 'success', text: 'Reward redeemed successfully!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to redeem reward. Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Already handled by redirect
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar">{user.email.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <h2>{user.email}</h2>
          <div className="profile-actions">
            <button 
              className="edit-profile"
              onClick={() => navigate('/profile/edit')}
            >
              Edit Profile
            </button>
            <button 
              className="logout-button"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{profile.points}</div>
          <div className="stat-label">Points</div>
          <div className="stat-description">
            {profile.scansToday} scans today
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">Level {profile.level}</div>
          <div className="stat-label">Current Level</div>
          <div className="level-progress">
            <div 
              className="level-bar" 
              style={{ width: `${(profile.level % 5) * 20}%` }}
            ></div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{profile.badges.length}</div>
          <div className="stat-label">Badges Earned</div>
          {profile.badges.length > 0 && (
            <div className="recent-badge">
              Latest: {profile.badges[profile.badges.length - 1]}
            </div>
          )}
        </div>
      </div>
      
      <div className="activity-section">
        <h3>Your Weekly Activity</h3>
        <div className="activity-chart">
          <Chart
            options={activityData.options}
            series={activityData.series}
            type="bar"
            height={250}
          />
        </div>
      </div>
      
      <div className="badges-section">
        <div className="section-header">
          <h3>Your Badges</h3>
          {profile.badges.length > 4 && (
            <button 
              className="view-all"
              onClick={() => navigate('/badges')}
            >
              View All
            </button>
          )}
        </div>
        {profile.badges.length > 0 ? (
          <div className="badges-grid">
            {profile.badges.slice(0, 4).map((badge, index) => (
              <div key={index} className="badge-item">
                <div className="badge-icon">🏆</div>
                <div className="badge-name">{badge}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No badges yet. Complete challenges to earn badges!</p>
            <button 
              className="cta-button"
              onClick={() => navigate('/challenges')}
            >
              View Challenges
            </button>
          </div>
        )}
      </div>
      
      <div className="rewards-section">
        <div className="section-header">
          <h3>Available Rewards</h3>
          <button 
            className="view-all"
            onClick={() => navigate('/rewards')}
          >
            View All Rewards
          </button>
        </div>
        {rewards.length > 0 ? (
          <div className="rewards-grid">
            {rewards.map((reward) => (
              <div key={reward.id} className="reward-item">
                <div className="reward-icon">{reward.icon || '🎁'}</div>
                <div className="reward-details">
                  <h4>{reward.name}</h4>
                  <p>{reward.description}</p>
                  <div className="reward-meta">
                    <span className="reward-points">{reward.required_points} points</span>
                    <button 
                      className="redeem-button"
                      onClick={() => handleRedeemReward(reward.id)}
                    >
                      Redeem Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You don't have enough points for rewards yet.</p>
            <button 
              className="cta-button"
              onClick={() => navigate('/scan')}
            >
              Start Scanning to Earn Points
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;