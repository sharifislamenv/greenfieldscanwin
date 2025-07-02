// D:\MyProjects\greenfield-scanwin\frontend\src\services\campaignService.jsx


import { supabase } from '../supabaseClient';

export const CampaignService = {
  // Fetch all campaigns with filtering options
  async getAllCampaigns({ activeOnly = false, featuredOnly = false, limit = null } = {}) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('start_date', { ascending: false });

    if (activeOnly) {
      const now = new Date().toISOString();
      query = query.lte('start_date', now).gte('end_date', now);
    }

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Get campaign by ID with full details
  async getCampaignById(id) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Get campaigns by type
  async getCampaignsByType(type, { activeOnly = true } = {}) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('type', type)
      .order('start_date', { ascending: false });

    if (activeOnly) {
      const now = new Date().toISOString();
      query = query.lte('start_date', now).gte('end_date', now);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Create new campaign
  async createCampaign(campaignData) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert([campaignData])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Update campaign
  async updateCampaign(id, updates) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Get campaign templates
  async getCampaignTemplates() {
    const { data, error } = await supabase
      .from('campaign_types')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  // Get campaigns with QR codes
  async getCampaignsWithQRCodes() {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        qr_codes:qr_codes(
          id,
          store_id,
          location
        )
      `)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    if (error) throw error;
    return data || [];
  },

  // Validate scan for campaign
  async validateScan(campaignId, userId, qrCodeId) {
    // Check if campaign is active
    const campaign = await this.getCampaignById(campaignId);
    const now = new Date();
    
    if (now < new Date(campaign.start_date) || now > new Date(campaign.end_date)) {
      throw new Error('Campaign is not active');
    }

    // Check if user has already participated
    const { count, error } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('qr_id', qrCodeId);

    if (error) throw error;
    if (count > 0) throw new Error('Already scanned this QR code');

    return true;
  },

  // Process campaign reward
  async processReward(campaignId, userId) {
    const campaign = await this.getCampaignById(campaignId);
    const reward = campaign.reward;
    
    // Process different reward types
    if (reward.type === 'points') {
      await supabase.rpc('increment_user_points', {
        user_id: userId,
        points: reward.value
      });
    } else if (reward.type === 'discount') {
      // Generate discount voucher
      const voucher = await this.generateDiscountVoucher(userId, reward);
      return voucher;
    }
    // Add other reward types as needed
    
    return { success: true, reward };
  },

  // Helper method to generate discount vouchers
  async generateDiscountVoucher(userId, rewardDetails) {
    const voucherCode = `VOUCHER-${Math.random().toString(36).substring(2, 10)}`;
    
    const { data, error } = await supabase
      .from('user_rewards')
      .insert([{
        user_id: userId,
        reward_type: 'discount',
        reward_value: JSON.stringify(rewardDetails),
        reward_code: voucherCode
      }])
      .select();

    if (error) throw error;
    return data[0];
  }
};