// src/pages/CampaignDetailsPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCampaigns } from '../contexts/CampaignContext';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';
import './CampaignDetailsPage.css';

const CampaignDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getCampaignById } = useCampaigns();
  const { user } = useUser();
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCampaign = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCampaignById(id);
        if (data) {
          setCampaign(data);
        } else {
          throw new Error("Campaign not found.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadCampaign();
  }, [id, getCampaignById]);

  const handleStartScan = () => {
    if (!user) {
      // Save the current page to redirect back after login
      navigate('/auth', { state: { from: location } });
    } else {
      navigate('/start-scan');
    }
  };

  if (isLoading) return <div className="loading">Loading Campaign...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;
  if (!campaign) return <div>Campaign not found.</div>;

  const isActive = new Date() >= new Date(campaign.start_date) && new Date() <= new Date(campaign.end_date);

  return (
    <div className="campaign-details-page">
      <div className="details-header" style={{backgroundImage: `url(${campaign.image_url || '/default-campaign-banner.jpg'})`}}>
        <h1>{campaign.name}</h1>
      </div>
      <div className="details-content">
        <p className="description">{campaign.description}</p>
        <div className="dates">
          <span>Active: {format(new Date(campaign.start_date), 'MMM d, yyyy')}</span> - 
          <span>{format(new Date(campaign.end_date), 'MMM d, yyyy')}</span>
        </div>
        
        {isActive && (
          <section className="scan-section">
            <h2>Ready to Participate?</h2>
            <button className="scan-button" onClick={handleStartScan}>
              {user ? 'Scan QR Code' : 'Login to Scan'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default CampaignDetailsPage;