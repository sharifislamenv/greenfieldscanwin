// src/pages/CampaignDetailsPage.jsx

import { CampaignService } from '../services/CampaignService';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCampaigns } from '../contexts/CampaignContext';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';
import './CampaignDetailsPage.css';

const CampaignDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCampaignById } = useCampaigns();
  const { user } = useUser();
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [scanStatus, setScanStatus] = useState('idle');

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const data = await getCampaignById(id);
        setCampaign(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCampaign();
  }, [id, getCampaignById]);

  const handleScan = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/campaigns/${id}` } });
      return;
    }

    setScanStatus('scanning');
    try {
      // In a real app, you would use a QR scanner library here
      // For demo, we'll simulate a scan
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate and process the scan
      const isValid = await CampaignService.validateScan(campaign.id, user.id, 'simulated-qr-id');
      if (isValid) {
        const reward = await CampaignService.processReward(campaign.id, user.id);
        setScanStatus('success');
      }
    } catch (err) {
      setScanStatus('error');
      setError(err.message);
      setTimeout(() => setScanStatus('idle'), 3000);
    }
  };

  if (isLoading) return <div className="loading">Loading campaign details...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!campaign) return <div>Campaign not found</div>;

  const isActive = new Date() >= new Date(campaign.start_date) && 
                   new Date() <= new Date(campaign.end_date);

  return (
    <div className="campaign-details-page">
      <div className="campaign-header">
        <div className={`campaign-badge ${campaign.type.toLowerCase()}`}>
          {campaign.type.replace(/_/g, ' ')}
        </div>
        {campaign.is_featured && <div className="featured-badge">Featured</div>}
        
        <h1>{campaign.name}</h1>
        <p className="description">{campaign.description}</p>
        
        <div className="campaign-meta">
          <div className="timeframe">
            <span className="label">Duration:</span>
            <span>
              {format(new Date(campaign.start_date), 'MMM d, yyyy')} -{' '}
              {format(new Date(campaign.end_date), 'MMM d, yyyy')}
            </span>
          </div>
          <div className={`status ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? 'Active Now' : 'Not Currently Active'}
          </div>
        </div>
      </div>
      
      {campaign.image_url && (
        <div className="campaign-image">
          <img src={campaign.image_url} alt={campaign.name} />
        </div>
      )}
      
      <div className="campaign-content">
        <section className="campaign-reward">
          <h2>Your Reward</h2>
          {typeof campaign.reward === 'object' ? (
            <div className="reward-details">
              <h3>{campaign.reward.value || campaign.reward.description}</h3>
              {campaign.reward.details && <p>{campaign.reward.details}</p>}
              {campaign.reward.terms && (
                <div className="terms">
                  <h4>Terms & Conditions:</h4>
                  <p>{campaign.reward.terms}</p>
                </div>
              )}
            </div>
          ) : (
            <p>{campaign.reward}</p>
          )}
        </section>
        
        <section className="campaign-rules">
          <h2>How To Participate</h2>
          {typeof campaign.rules === 'object' ? (
            <ul className="rules-list">
              {Object.entries(campaign.rules).map(([key, value]) => (
                <li key={key}>
                  <strong>{key.replace(/_/g, ' ')}:</strong> {JSON.stringify(value)}
                </li>
              ))}
            </ul>
          ) : (
            <p>{campaign.rules}</p>
          )}
        </section>
        
        {isActive && (
          <section className="scan-section">
            <h2>Scan to Participate</h2>
            <div className={`scanner ${scanStatus}`}>
              {scanStatus === 'idle' && (
                <>
                  <p>Point your camera at a campaign QR code</p>
                  <div className="qr-placeholder"></div>
                </>
              )}
              {scanStatus === 'scanning' && (
                <div className="scanning-animation"></div>
              )}
              {scanStatus === 'success' && (
                <div className="success-message">
                  <h3>Scan Successful!</h3>
                  <p>Your reward has been credited to your account.</p>
                </div>
              )}
              {scanStatus === 'error' && (
                <div className="error-message">
                  <h3>Scan Failed</h3>
                  <p>{error || 'Please try again.'}</p>
                </div>
              )}
            </div>
            
            <button 
              className={`scan-button ${scanStatus}`}
              onClick={handleScan}
              disabled={scanStatus !== 'idle'}
            >
              {scanStatus === 'scanning' ? 'Scanning...' : 'Scan QR Code'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default CampaignDetailsPage;