//D:\MyProjects\greenfield-scanwin\frontend\src\pages\UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      const { data: profile } = await supabase
        .from('users')
        .select('points, level, badges')
        .eq('id', authUser.id)
        .single();
      
      if (profile) {
        setUser(authUser);
        setPoints(profile.points);
        setLevel(profile.level);
        setBadges(profile.badges || []);
      }
    };
    
    fetchUserData();
  }, []);

  if (!user) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar">{user.email.charAt(0).toUpperCase()}</div>
        <h2>{user.email}</h2>
      </div>
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{points}</div>
          <div className="stat-label">Points</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">Level {level}</div>
          <div className="stat-label">Current Level</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{badges.length}</div>
          <div className="stat-label">Badges</div>
        </div>
      </div>
      
      <div className="badges-section">
        <h3>Your Badges</h3>
        {badges.length > 0 ? (
          <div className="badges-grid">
            {badges.map((badge, index) => (
              <div key={index} className="badge-item">
                <div className="badge-icon">🏆</div>
                <div className="badge-name">{badge}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>No badges yet. Complete challenges to earn badges!</p>
        )}
      </div>
      
      <div className="rewards-section">
        <h3>Available Rewards</h3>
        <div className="rewards-list">
          <div className="reward-item">
            <div className="reward-icon">🎟️</div>
            <div className="reward-details">
              <h4>10% Off Coupon</h4>
              <p>50 points</p>
            </div>
          </div>
          <div className="reward-item">
            <div className="reward-icon">🎁</div>
            <div className="reward-details">
              <h4>Free Product</h4>
              <p>200 points</p>
            </div>
          </div>
          <div className="reward-item">
            <div className="reward-icon">⭐</div>
            <div className="reward-details">
              <h4>VIP Experience</h4>
              <p>500 points</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;