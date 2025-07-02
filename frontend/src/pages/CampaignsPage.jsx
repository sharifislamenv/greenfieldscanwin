// src/pages/CampaignsPage.jsx

import React from 'react';
import { useCampaigns } from '../contexts/CampaignContext';
import CampaignCard from '../components/CampaignCard';
import './CampaignsPage.css';

const CampaignsPage = () => {
  const { activeCampaigns, featuredCampaigns } = useCampaigns();

  return (
    <div className="campaigns-page">
      <div className="hero-section">
        <h1>Current Campaigns</h1>
        <p>Participate in our exciting scan-and-win campaigns to earn rewards!</p>
      </div>
      
      {featuredCampaigns.length > 0 && (
        <section className="featured-campaigns">
          <h2>Featured Campaigns</h2>
          <div className="campaigns-grid">
            {featuredCampaigns.map(campaign => (
              <CampaignCard 
                key={campaign.id} 
                campaign={campaign} 
                isClickable={true}
                size="large"
              />
            ))}
          </div>
        </section>
      )}
      
      <section className="all-campaigns">
        <h2>All Active Campaigns</h2>
        <div className="campaigns-grid">
          {activeCampaigns.length > 0 ? (
            activeCampaigns.map(campaign => (
              <CampaignCard 
                key={campaign.id} 
                campaign={campaign} 
                isClickable={true}
                size="medium"
              />
            ))
          ) : (
            <p>No active campaigns at the moment. Check back soon!</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default CampaignsPage;