// D:\MyProjects\greenfield-scanwin\frontend\src\contexts\CampaignContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CampaignService } from '../services/campaignService';

const CampaignContext = createContext();

export const CampaignProvider = ({ children }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const [allCampaigns, featured, active] = await Promise.all([
        CampaignService.getAllCampaigns(),
        CampaignService.getAllCampaigns({ featuredOnly: true, limit: 3 }),
        CampaignService.getAllCampaigns({ activeOnly: true })
      ]);
      
      setCampaigns(allCampaigns);
      setFeaturedCampaigns(featured);
      setActiveCampaigns(active);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCampaignById = async (id) => {
    try {
      return await CampaignService.getCampaignById(id);
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const getCampaignsByType = async (type) => {
    try {
      return await CampaignService.getCampaignsByType(type);
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        featuredCampaigns,
        activeCampaigns,
        isLoading,
        error,
        getCampaignById,
        getCampaignsByType,
        refreshCampaigns: loadCampaigns
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaigns = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaigns must be used within a CampaignProvider');
  }
  return context;
};