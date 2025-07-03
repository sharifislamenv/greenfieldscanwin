// src/components/CampaignForm.jsx

import React, { useState, useEffect } from 'react';
import { CampaignService } from '../services/CampaignService';
import { useCampaigns } from '../contexts/CampaignContext';
import './CampaignForm.css';

const CampaignForm = ({ campaign, isCreating, onCancel, onSuccess }) => {
  const { refreshCampaigns } = useCampaigns();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'seasonal',
    start_date: '',
    end_date: '',
    rules: {},
    reward: {},
    is_active: true,
    is_featured: false,
    image_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        start_date: campaign.start_date.split('T')[0],
        end_date: campaign.end_date.split('T')[0],
        rules: campaign.rules || {},
        reward: campaign.reward || {},
        is_active: campaign.is_active,
        is_featured: campaign.is_featured || false,
        image_url: campaign.image_url || ''
      });
    }
  }, [campaign]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleJsonChange = (field, value) => {
    try {
      const parsed = JSON.parse(value);
      setFormData(prev => ({
        ...prev,
        [field]: parsed
      }));
    } catch (err) {
      console.error('Invalid JSON', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const campaignData = {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      if (isCreating) {
        await CampaignService.createCampaign(campaignData);
      } else {
        await CampaignService.updateCampaign(campaign.id, campaignData);
      }

      refreshCampaigns();
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="campaign-form">
      <h2>{isCreating ? 'Create New Campaign' : 'Edit Campaign'}</h2>
      
      <div className="form-group">
        <label>Campaign Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="seasonal">Seasonal</option>
            <option value="product_launch">Product Launch</option>
            <option value="global_quest">Global Quest</option>
            <option value="scanwin_discount">Scan-to-Win Discount</option>
            <option value="scanwin_points">Scan-to-Earn Points</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Image URL</label>
          <input
            type="url"
            name="image_url"
            value={formData.image_url}
            onChange={handleChange}
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>End Date</label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            Active
          </label>
        </div>
        
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="is_featured"
              checked={formData.is_featured}
              onChange={handleChange}
            />
            Featured
          </label>
        </div>
      </div>
      
      <div className="form-group">
        <label>Rules (JSON)</label>
        <textarea
          value={JSON.stringify(formData.rules, null, 2)}
          onChange={(e) => handleJsonChange('rules', e.target.value)}
          className="json-input"
        />
      </div>
      
      <div className="form-group">
        <label>Reward (JSON)</label>
        <textarea
          value={JSON.stringify(formData.reward, null, 2)}
          onChange={(e) => handleJsonChange('reward', e.target.value)}
          className="json-input"
        />
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Campaign'}
        </button>
      </div>
    </form>
  );
};

export default CampaignForm;