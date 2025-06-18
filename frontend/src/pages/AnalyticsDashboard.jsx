//D:\MyProjects\greenfield-scanwin\frontend\src\pages\AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Chart from 'react-apexcharts';
import './AnalyticsDashboard.css'; // Add this line

const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalScans: 0,
    validScans: 0,
    socialShares: 0,
    referrals: 0
  });
  
  const [scanData, setScanData] = useState({
    options: {
      chart: { id: 'scans-chart' },
      xaxis: { categories: [] }
    },
    series: [{ name: 'Scans', data: [] }]
  });
  
  const [socialData, setSocialData] = useState({
    options: {
      labels: ['Instagram', 'TikTok', 'Facebook', 'Twitter']
    },
    series: [0, 0, 0, 0]
  });
  
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Get scan metrics
        const { count: totalScans } = await supabase
          .from('scans')
          .select('*', { count: 'exact' });
        
        const { count: validScans } = await supabase
          .from('scans')
          .select('*', { count: 'exact' })
          .eq('validation_status', 'verified');
        
        // Social shares
        const { count: socialShares } = await supabase
          .from('social_shares')
          .select('*', { count: 'exact' });
        
        // Referrals
        const { count: referrals } = await supabase
          .from('referrals')
          .select('*', { count: 'exact' });
        
        // Social breakdown
        const { data: socialBreakdown } = await supabase
          .from('social_shares')
          .select('platform, count(*)')
          .group('platform');
        
        const socialSeries = [
          socialBreakdown.find(s => s.platform === 'instagram')?.count || 0,
          socialBreakdown.find(s => s.platform === 'tiktok')?.count || 0,
          socialBreakdown.find(s => s.platform === 'facebook')?.count || 0,
          socialBreakdown.find(s => s.platform === 'twitter')?.count || 0
        ];
        
        // Scan timeline
        const { data: scanTimeline } = await supabase
          .rpc('get_daily_scans');
        
        setMetrics({
          totalScans,
          validScans,
          socialShares,
          referrals
        });
        
        setSocialData({
          ...socialData,
          series: socialSeries
        });
        
        setScanData({
          options: {
            ...scanData.options,
            xaxis: { categories: scanTimeline.map(d => d.date) }
          },
          series: [{ 
            name: 'Daily Scans', 
            data: scanTimeline.map(d => d.count) 
          }]
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    const fetchLeaderboard = async () => {
      try {
        const { data } = await supabase
          .from('leaderboard')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(10);
        
        setLeaderboard(data || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    const setupRealtime = () => {
      try {
        const channel = supabase
          .channel('scans')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            fetchMetrics();
            fetchLeaderboard();
          })
          .subscribe();
        
        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up realtime:', error);
      }
    };

    fetchMetrics();
    fetchLeaderboard();
    setupRealtime();
  }, []);

  return (
    <div className="dashboard">
      <h1>Campaign Analytics Dashboard</h1>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Scans</h3>
          <p>{metrics.totalScans}</p>
        </div>
        <div className="metric-card">
          <h3>Valid Scans</h3>
          <p>{metrics.validScans}</p>
          <small>{(metrics.totalScans > 0 ? 
            ((metrics.validScans / metrics.totalScans) * 100).toFixed(1) : 0)}% success rate</small>
        </div>
        <div className="metric-card">
          <h3>Social Shares</h3>
          <p>{metrics.socialShares}</p>
        </div>
        <div className="metric-card">
          <h3>Referrals</h3>
          <p>{metrics.referrals}</p>
        </div>
      </div>
      
      <div className="chart-row">
        <div className="chart-container">
          <h3>Scan Activity</h3>
          <Chart
            options={scanData.options}
            series={scanData.series}
            type="area"
            height={300}
          />
        </div>
        
        <div className="chart-container">
          <h3>Social Platform Distribution</h3>
          <Chart
            options={socialData.options}
            series={socialData.series}
            type="donut"
            height={300}
          />
        </div>
      </div>
      
      <div className="leaderboard-section">
        <h3>Top Participants</h3>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Participant</th>
              <th>Points</th>
              <th>Level</th>
              <th>Badges</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.email}</td>
                <td>{user.total_points}</td>
                <td>{user.level}</td>
                <td>
                  {user.badges && user.badges.map(badge => (
                    <span key={badge} className="badge">{badge}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;