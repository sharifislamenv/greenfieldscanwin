//D:\MyProjects\greenfield-scanwin\frontend\src\components\CampaignManager.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    type: 'seasonal',
    start_date: '',
    end_date: '',
    rules: {
      min_scans: 0,
      min_purchases: 0,
      required_items: []
    },
    reward: {
      type: 'discount',
      value: ''
    }
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching campaigns:', error);
      return;
    }
    
    setCampaigns(data || []);
  };

  const createCampaign = async () => {
    const { error } = await supabase
      .from('campaigns')
      .insert([newCampaign]);
    
    if (error) {
      console.error('Error creating campaign:', error);
      return;
    }
    
    fetchCampaigns();
    setNewCampaign({
      name: '',
      description: '',
      type: 'seasonal',
      start_date: '',
      end_date: '',
      rules: {
        min_scans: 0,
        min_purchases: 0,
        required_items: []
      },
      reward: {
        type: 'discount',
        value: ''
      }
    });
  };

  const createHolidayScavengerHunt = () => {
    setNewCampaign({
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
    });
  };

  const createProductLaunch = () => {
    setNewCampaign({
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
    });
  };

  const createGlobalQuest = () => {
    setNewCampaign({
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
    });
  };

  const createSummerLaunch = () => {
    setNewCampaign({
      name: 'Summer Launch 2025',
      description: 'Campaign for the launch of our new summer product line',
      type: 'seasonal',
      start_date: new Date('2025-06-01').toISOString(),
      end_date: new Date('2025-08-31').toISOString(),
      rules: {
        min_scans: 2,
        min_purchases: 1,
        required_items: ['Summer Product 1', 'Summer Product 2']
      },
      reward: {
        type: 'discount',
        value: '20% Off Summer Collection'
      }
    });
  };

  return (
    <div className="campaign-manager">
      <h2>Campaign Management</h2>
      
      <div className="campaign-templates">
        <button onClick={createHolidayScavengerHunt}>Create Holiday Hunt</button>
        <button onClick={createProductLaunch}>New Product Launch</button>
        <button onClick={createGlobalQuest}>Global QR Quest</button>
        <button onClick={createSummerLaunch}>Summer Launch</button>
      </div>
      
      <div className="campaign-form">
        <h3>{newCampaign.name || 'Create New Campaign'}</h3>
        
        <div className="form-group">
          <label>Campaign Name</label>
          <input 
            type="text" 
            value={newCampaign.name}
            onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={newCampaign.description}
            onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input 
              type="date" 
              value={newCampaign.start_date.split('T')[0]}
              onChange={(e) => setNewCampaign({
                ...newCampaign, 
                start_date: new Date(e.target.value).toISOString()
              })}
            />
          </div>
          
          <div className="form-group">
            <label>End Date</label>
            <input 
              type="date" 
              value={newCampaign.end_date.split('T')[0]}
              onChange={(e) => setNewCampaign({
                ...newCampaign, 
                end_date: new Date(e.target.value).toISOString()
              })}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Reward Type</label>
          <select
            value={newCampaign.reward.type}
            onChange={(e) => setNewCampaign({
              ...newCampaign,
              reward: {...newCampaign.reward, type: e.target.value}
            })}
          >
            <option value="discount">Discount</option>
            <option value="coupon">Coupon</option>
            <option value="gift">Physical Gift</option>
            <option value="experience">Experience</option>
            <option value="early_access">Early Access</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Reward Value</label>
          <input 
            type="text" 
            value={newCampaign.reward.value}
            onChange={(e) => setNewCampaign({
              ...newCampaign,
              reward: {...newCampaign.reward, value: e.target.value}
            })}
          />
        </div>
        
        <button onClick={createCampaign}>Create Campaign</button>
      </div>
      
      <div className="campaign-list">
        <h3>Active Campaigns</h3>
        {campaigns.filter(c => new Date(c.end_date) > new Date()).map(campaign => (
          <div key={campaign.id} className="campaign-item">
            <h4>{campaign.name}</h4>
            <p>{campaign.description}</p>
            <p><strong>Duration:</strong> {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}</p>
            <p><strong>Reward:</strong> {campaign.reward.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignManager;