//D:\MyProjects\greenfield-scanwin\frontend\src\components\RewardUnlock.jsx
import React from 'react';

const RewardUnlock = ({ level, reward, onContinue }) => {
  const getRewardIcon = () => {
    switch(reward.type) {
      case 'coupon': return '🎟️';
      case 'video': return '🎬';
      case 'social': return '📱';
      case 'referral': return '👥';
      default: return '🎁';
    }
  };

  return (
    <div className="reward-unlock">
      <div className="reward-badge">Level {level}</div>
      <div className="reward-icon">{getRewardIcon()}</div>
      <h2>Congratulations!</h2>
      <p>You've unlocked a Level {level} Reward</p>
      
      <div className="reward-card">
        <h3>{reward.value}</h3>
        <p>{reward.description || 'Enjoy your reward!'}</p>
      </div>
      
      <button 
        className="continue-button"
        onClick={onContinue}
      >
        Continue to {level < 4 ? `Level ${level + 1}` : 'Dashboard'}
      </button>
    </div>
  );
};

export default RewardUnlock;