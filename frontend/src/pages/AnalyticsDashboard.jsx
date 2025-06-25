//D:\MyProjects\greenfield-scanwin\frontend\src\pages\AnalyticsDashboard.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Chart from 'react-apexcharts';
import './AnalyticsDashboard.css';

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
    options: { labels: [] },
    series: []
  });
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          { count: totalScans },
          { count: validScans },
          { count: socialShares },
          { count: referrals },
          { data: scanTimeline },
          { data: shareData },
          { data: leaderboardData }
        ] = await Promise.all([
          supabase.from('scans').select('*', { count: 'exact' }),
          supabase.from('scans').select('*', { count: 'exact' }).eq('validation_status', 'verified'),
          supabase.from('social_shares').select('*', { count: 'exact' }),
          supabase.from('referrals').select('*', { count: 'exact' }),
          supabase.rpc('get_weekly_scan_data'),
          supabase.rpc('get_platform_share_distribution'),
          supabase.from('leaderboard').select('*').order('total_points', { ascending: false }).limit(10)
        ]);

        setMetrics({
          totalScans: totalScans || 0,
          validScans: validScans || 0,
          socialShares: socialShares || 0,
          referrals: referrals || 0
        });

        setScanData({
          options: {
            chart: { id: 'scans-chart', toolbar: { show: false } },
            xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
            colors: ['#3b82f6'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth' }
          },
          series: [{ 
            name: 'Scans', 
            data: scanTimeline || Array(7).fill(0) 
          }]
        });

        setSocialData({
          options: {
            labels: shareData?.map(item => item.platform) || [],
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
          },
          series: shareData?.map(item => item.count) || []
        });

        setLeaderboard(leaderboardData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dashboard">
      <h1>Campaign Analytics Dashboard</h1>
      
      {error && <div className="error-message">{error}</div>}
      
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
          {isLoading ? (
            <div className="loader">Loading chart...</div>
          ) : (
            <Chart
              options={scanData.options}
              series={scanData.series}
              type="bar"
              height={300}
            />
          )}
        </div>
        
        <div className="chart-container">
          <h3>Social Platform Distribution</h3>
          {isLoading ? (
            <div className="loader">Loading chart...</div>
          ) : (
            <Chart
              options={socialData.options}
              series={socialData.series}
              type="donut"
              height={300}
            />
          )}
        </div>
      </div>
      
      <div className="leaderboard-section">
        <h3>Top Participants</h3>
        {isLoading ? (
          <div className="loader">Loading leaderboard...</div>
        ) : (
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
              {leaderboard.length > 0 ? (
                leaderboard.map((user, index) => (
                  <tr key={user.id} className={index === 0 ? 'top-player' : ''}>
                    <td>{index + 1}</td>
                    <td>{user.email}</td>
                    <td>{user.total_points}</td>
                    <td>{user.level}</td>
                    <td>
                      {user.badges?.map((badge, i) => (
                        <span key={i} className="badge">{badge}</span>
                      ))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">No participants yet</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;