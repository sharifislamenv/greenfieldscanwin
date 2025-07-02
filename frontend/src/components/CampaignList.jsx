// src/components/CampaignList.jsx

import React from 'react';
import { useCampaigns } from '../contexts/CampaignContext';
import CampaignCard from './CampaignCard';
import './CampaignList.css';

const CampaignList = ({ type = 'all', title = 'Campaigns', limit = null }) => {
  const { campaigns, activeCampaigns, featuredCampaigns, isLoading, error } = useCampaigns();
  
  const getDisplayCampaigns = () => {
    switch (type) {
      case 'active':
        return activeCampaigns;
      case 'featured':
        return featuredCampaigns;
      case 'all':
      default:
        return campaigns;
    }
  };

  const displayCampaigns = limit ? getDisplayCampaigns().slice(0, limit) : getDisplayCampaigns();

  if (isLoading) return <div className="loading">Loading campaigns...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="campaign-list">
      <h2 className="section-title">{title}</h2>
      {displayCampaigns.length > 0 ? (
        <div className="campaign-grid">
          {displayCampaigns.map(campaign => (
            <CampaignCard 
              key={campaign.id} 
              campaign={campaign} 
              isClickable={true}
            />
          ))}
        </div>
      ) : (
        <p className="no-campaigns">No campaigns found</p>
      )}
    </div>
  );
};

export default CampaignList;