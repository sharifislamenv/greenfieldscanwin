//D:\MyProjects\greenfield-scanwin\frontend\src\App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// --- (CHANGE 1) IMPORT THE HOMEPAGE COMPONENT ---
import HomePage from './pages/HomePage'; 
import ScanPage from './pages/ScanPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import CampaignManager from './components/CampaignManager';
import AuthPage from './pages/AuthPage';
import UserProfile from './pages/UserProfile';
import './App.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const user = supabase.auth.getUser();
  return user ? children : <Navigate to="/auth" replace />;
};

// Admin protected route
const AdminRoute = ({ children }) => {
  const user = supabase.auth.getUser();
  // In a real app, check admin role from user metadata
  return user ? children : <Navigate to="/auth" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- (CHANGE 2) USE THE HOMEPAGE COMPONENT FOR THE ROOT PATH --- */}
        <Route path="/" element={<HomePage />} />
        
        <Route path="/scan" element={
          <ProtectedRoute>
            <ScanPage />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <AdminRoute>
            <CampaignManager />
          </AdminRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/auth" element={<AuthPage />} />
        
        <Route path="*" element={
          <div className="not-found">
            <h1>404 - Page Not Found</h1>
            <p>Return to <a href="/">homepage</a></p>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;