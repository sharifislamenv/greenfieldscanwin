// D:\MyProjects\greenfield-scanwin\frontend\src\App.js

// src/App.js
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary'; // Install with: npm install react-error-boundary
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CampaignProvider } from './contexts/CampaignContext';
import { UserProvider } from './contexts/UserContext';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ScanPage from './pages/ScanPage';
import UserProfile from './pages/UserProfile';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFound from './components/NotFound';
import QRCodeScanner from './components/QRCodeScanner';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailsPage from './pages/CampaignDetailsPage';
import CampaignManager from './components/CampaignManager';

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <UserProvider>
      <CampaignProvider>
        <Router basename="/">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset" element={<ResetPasswordPage />} />
            <Route path="/start-scan" element={<QRCodeScanner />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/dashboard" element={<AnalyticsDashboard />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
            <Route path="/manage-campaigns" element={<CampaignManager />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </CampaignProvider>
    </UserProvider>
    </ErrorBoundary>    
  );
}

function ErrorFallback({ error }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  );
}

export default App;