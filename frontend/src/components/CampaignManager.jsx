//D:\MyProjects\greenfield-scanwin\frontend\src\components\CampaignManager.jsx

// src/components/CampaignManager.jsx
import React, { useState, useEffect } from 'react';
import { useCampaigns } from '../contexts/CampaignContext';
import CampaignForm from './CampaignForm';
import './CampaignManager.css';

const CampaignManager = () => {
  const { campaigns, refreshCampaigns } = useCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState('list'); // 'list', 'form', 'templates'

  const handleCreateNew = () => {
    setSelectedCampaign(null);
    setIsCreating(true);
    setView('form');
  };

  const handleEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setIsCreating(false);
    setView('form');
  };

  const handleCancel = () => {
    setSelectedCampaign(null);
    setView('list');
  };

  const handleSuccess = () => {
    refreshCampaigns();
    setView('list');
  };

  return (
    <div className="campaign-manager">
      <div className="manager-header">
        <h2>Campaign Management</h2>
        <div className="action-buttons">
          <button onClick={() => setView('templates')} className="secondary">
            Use Template
          </button>
          <button onClick={handleCreateNew} className="primary">
            Create New Campaign
          </button>
        </div>
      </div>

      {view === 'list' && (
        <div className="campaign-list">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => {
                const isActive = new Date() >= new Date(campaign.start_date) && 
                               new Date() <= new Date(campaign.end_date);
                return (
                  <tr key={campaign.id}>
                    <td>{campaign.name}</td>
                    <td>{campaign.type}</td>
                    <td>
                      <span className={`status ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                      {new Date(campaign.end_date).toLocaleDateString()}
                    </td>
                    <td>
                      <button onClick={() => handleEdit(campaign)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'form' && (
        <CampaignForm 
          campaign={selectedCampaign} 
          isCreating={isCreating}
          onCancel={handleCancel}
          onSuccess={handleSuccess}
        />
      )}

      {view === 'templates' && (
        <CampaignTemplates 
          onSelect={template => {
            setSelectedCampaign(template);
            setView('form');
          }}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  );
};

const CampaignTemplates = ({ onSelect, onCancel }) => {
  const templates = [
    {
      name: 'Holiday Scavenger Hunt',
      description: 'Find and scan special holiday QR codes in-store',
      type: 'seasonal',
      start_date: new Date(new Date().getFullYear(), 11, 1).toISOString(),
      end_date: new Date(new Date().getFullYear(), 11, 31).toISOString(),
      rules: {
        min_scans: 3,
        min_purchases: 1,
        required_items: ['Holiday Special']
      },
      reward: {
        type: 'gift',
        value: 'Limited Edition Holiday Package'
      }
    },
    {
      name: 'New Product Launch',
      description: 'Be among the first to experience our latest product',
      type: 'product_launch',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      rules: {
        min_scans: 1,
        min_purchases: 1,
        required_items: ['New Product X']
      },
      reward: {
        type: 'early_access',
        value: 'Exclusive Early Access'
      }
    },
    {
      name: 'Global QR Quest',
      description: 'Scan QR codes across multiple locations for mega rewards',
      type: 'global_quest',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      rules: {
        min_scans: 10,
        min_purchases: 5,
        min_locations: 3
      },
      reward: {
        type: 'experience',
        value: 'VIP Brand Experience'
      }
    },
    {
      name: 'ShortStopSinclair Gas Discount',
      description: 'Scan to receive discounts on gas purchases',
      type: 'seasonal',
      start_date: new Date('2025-07-17').toISOString(),
      end_date: new Date('2025-08-16').toISOString(),
      rules: {
        change_region: "Store",
        store: "ShortStopSinclair",
        required_scans: 1,
        time_limit_minutes: 30
      },
      reward: {
        type: 'discount',
        value: '65 cents per gallon',
        value_type: 'per_gallon',
        max_gallons: 30
      }
    }
  ];

  return (
    <div className="campaign-templates">
      <h3>Select a Template</h3>
      <div className="template-grid">
        {templates.map((template, index) => (
          <div key={index} className="template-card" onClick={() => onSelect(template)}>
            <h4>{template.name}</h4>
            <p>{template.description}</p>
            <div className="template-type">{template.type}</div>
          </div>
        ))}
      </div>
      <button onClick={onCancel} className="cancel-button">
        Back to List
      </button>
    </div>
  );
};

export default CampaignManager;