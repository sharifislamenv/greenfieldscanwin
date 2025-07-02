// src/pages/CampaignsPage.jsx

import React from 'react';
import { useCampaigns } from '../contexts/CampaignContext';
import CampaignList from '../components/CampaignList';
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
          <CampaignList type="featured" />
        </section>
      )}
      
      <section className="all-campaigns">
        <h2>All Active Campaigns</h2>
        <CampaignList type="active" />
      </section>
    </div>
  );
};

export default CampaignsPage;