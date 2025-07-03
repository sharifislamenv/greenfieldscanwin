//D:\MyProjects\greenfield-scanwin\frontend\src\components\CampaignManager.jsx

import React, { useState, useEffect } from 'react';
import { CampaignService } from '../services/CampaignService';
import './CampaignManager.css'; // Assuming you have styles for this component

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState({ name: '', description: '', start_date: '', end_date: '', is_active: true, type: 'seasonal', rules: {}, reward: {} });

  const fetchCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CampaignService.getAllCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleJsonChange = (field, value) => {
    try {
      const parsed = JSON.parse(value);
      setFormState(prev => ({ ...prev, [field]: parsed }));
    } catch (e) {
      // Handle JSON parsing error if needed
      console.warn("Invalid JSON format");
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await CampaignService.createCampaign(formState);
      alert('Campaign created successfully!');
      fetchCampaigns(); // Refresh the list
    } catch (err) {
      setError(err.message);
      console.error("Error creating campaign:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="campaign-manager">
      <h2>Campaign Management</h2>
      {error && <p className="error-message">{error}</p>}
      
      <form onSubmit={handleCreateCampaign} className="campaign-form">
        <h3>Create New Campaign</h3>
        <input name="name" value={formState.name} onChange={handleInputChange} placeholder="Campaign Name" required />
        <textarea name="description" value={formState.description} onChange={handleInputChange} placeholder="Description" />
        <input type="date" name="start_date" value={formState.start_date} onChange={handleInputChange} required />
        <input type="date" name="end_date" value={formState.end_date} onChange={handleInputChange} required />
        <textarea value={JSON.stringify(formState.rules, null, 2)} onChange={(e) => handleJsonChange('rules', e.target.value)} placeholder="Rules (JSON)" />
        <textarea value={JSON.stringify(formState.reward, null, 2)} onChange={(e) => handleJsonChange('reward', e.target.value)} placeholder="Reward (JSON)" />
        <label><input type="checkbox" name="is_active" checked={formState.is_active} onChange={handleInputChange} /> Active</label>
        <button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Campaign'}</button>
      </form>

      <div className="campaign-list">
        <h3>Existing Campaigns</h3>
        {isLoading && <p>Loading campaigns...</p>}
        <ul>
          {campaigns.map(campaign => (
            <li key={campaign.id}><strong>{campaign.name}</strong> ({campaign.is_active ? 'Active' : 'Inactive'})</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CampaignManager;