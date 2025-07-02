
//D:\MyProjects\greenfield-scanwin\frontend\src\components\CampaignCard.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import './CampaignCard.css';

const CampaignCard = ({ campaign, isClickable = true, size = 'medium' }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (isClickable) {
      navigate(`/campaigns/${campaign.id}`);
    }
  };

  const getRewardDisplay = () => {
    if (typeof campaign.reward === 'object') {
      if (campaign.reward.value_type === 'per_gallon') {
        return `${campaign.reward.value} per gallon`;
      }
      return campaign.reward.value || campaign.reward.description || 'Special Reward';
    }
    return campaign.reward || 'No reward specified';
  };

  const isActive = () => {
    const now = new Date();
    return now >= new Date(campaign.start_date) && now <= new Date(campaign.end_date);
  };

  return (
    <div 
      className={`campaign-card ${size} ${isClickable ? 'clickable' : ''} ${isActive() ? 'active' : 'inactive'}`}
      onClick={handleClick}
    >
      <div className="campaign-header">
        <div className={`campaign-badge ${campaign.type.toLowerCase()}`}>
          {campaign.type.replace(/_/g, ' ')}
        </div>
        {campaign.is_featured && <div className="featured-badge">Featured</div>}
      </div>
      
      {campaign.image_url && (
        <div className="campaign-image">
          <img src={campaign.image_url} alt={campaign.name} />
        </div>
      )}
      
      <div className="campaign-content">
        <h3>{campaign.name}</h3>
        <p className="description">{campaign.description}</p>
        
        <div className="campaign-dates">
          <div className="date-range">
            <span className="date-label">Starts:</span>
            <span>{format(new Date(campaign.start_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="date-range">
            <span className="date-label">Ends:</span>
            <span>{format(new Date(campaign.end_date), 'MMM d, yyyy')}</span>
          </div>
        </div>
        
        <div className="campaign-reward">
          <span className="reward-label">Reward:</span>
          <span className="reward-value">{getRewardDisplay()}</span>
        </div>
      </div>
      
      <div className="campaign-footer">
        <div className={`status-indicator ${isActive() ? 'active' : 'inactive'}`}>
          {isActive() ? 'Active Now' : 'Coming Soon'}
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;