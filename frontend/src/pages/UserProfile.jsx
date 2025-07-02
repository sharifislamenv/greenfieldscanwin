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
      plotOptions: { bar: { borderRadius: 4, horizontal: false, } }
    },
    series: [
      { name: 'Scans', data: [0, 0, 0, 0, 0, 0, 0] }
    ]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          navigate('/auth'); // Redirect to login if not authenticated
          return;
        }
        
        // Use Promise.all to fetch data in parallel for better performance
        const [profileResponse, rewardsResponse, activityResponse] = await Promise.all([
          supabase.from('users').select('points, level, badges, scans_today').eq('id', authUser.id).single(),
          supabase.from('rewards').select('*').order('required_points', { ascending: true }),
          supabase.rpc('get_user_activity', { user_id: authUser.id })
        ]);

        if (profileResponse.error) throw profileResponse.error;
        if (rewardsResponse.error) throw rewardsResponse.error;
        if (activityResponse.error) throw activityResponse.error;

        const profileData = profileResponse.data;
        const rewardsData = rewardsResponse.data;
        const activity = activityResponse.data;

        if (profileData) {
          setUser(authUser);
          setProfile({
            points: profileData.points || 0,
            level: profileData.level || 1,
            badges: profileData.badges || [],
            scansToday: profileData.scans_today || 0
          });

          // Filter rewards to show only those the user can afford
          setRewards(rewardsData?.filter(r => r.required_points <= profileData.points) || []);
          
          if (activity) {
            setActivityData(prev => ({
              ...prev,
              series: [{ name: 'Scans', data: activity }]
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setMessage({ type: 'error', text: 'Failed to load profile data.' });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);

  const handleRedeemReward = async (rewardId) => {
    // A confirmation step is good UX
    if (!window.confirm("Are you sure you want to redeem this reward?")) {
        return;
    }

    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward || profile.points < reward.required_points) {
        throw new Error("You don't have enough points for this reward.");
      }

      // 1. Deduct points from user
      const newPoints = profile.points - reward.required_points;
      const { error: updateError } = await supabase
        .from('users')
        .update({ points: newPoints })
        .eq('id', user.id);
        
      if (updateError) throw updateError;

      // 2. Log the redemption
      const { error: insertError } = await supabase
        .from('user_rewards')
        .insert([{ 
          user_id: user.id, 
          reward_id: rewardId,
          reward_type: reward.type,
          reward_value: reward.value
        }]);
      
      if (insertError) throw insertError;
      
      // 3. Update state locally for instant UI feedback
      setProfile(prev => ({ ...prev, points: newPoints }));
      setRewards(prev => prev.filter(r => r.id !== rewardId));
      setMessage({ type: 'success', text: 'Reward redeemed successfully!' });

    } catch (error) {
      console.error("Failed to redeem reward:", error);
      setMessage({ type: 'error', text: error.message });
    }
  };

  /*const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };*/

  const handleLogout = async () => {
  try {
    window.localStorage.removeItem('sb-data');
    window.localStorage.removeItem(`sb-${supabase.supabaseUrl}-auth-token`);
    await supabase.auth.signOut();
    window.location.href = '/auth';
  } catch (error) {
    console.error('Logout error:', error);
    setMessage({ type: 'error', text: 'Failed to logout. Please try again.' });
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

  return (
    <div className="user-profile">
        {message.text && (
            <div className={`auth-message ${message.type}`} onClick={() => setMessage({type:'', text:''})}>
                {message.text}
            </div>
        )}

      <div className="profile-header">
        <div className="avatar">{user.email.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <h2>{user.email}</h2>
          <div className="profile-actions">
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{profile.points}</div>
          <div className="stat-label">Points</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.level}</div>
          <div className="stat-label">Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profile.badges.length}</div>
          <div className="stat-label">Badges</div>
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
        <h3>Your Badges</h3>
        {profile.badges.length > 0 ? (
          <div className="badges-grid">
            {profile.badges.map((badge, index) => (
              <div key={index} className="badge-item">
                <div className="badge-icon">🏆</div>
                <div className="badge-name">{badge}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>No badges earned yet. Keep scanning!</p>
        )}
      </div>
      
      <div className="rewards-section">
        <h3>Available Rewards</h3>
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
                      Redeem
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
              onClick={() => navigate('/start-scan')}
            >
              Start Scanning
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;