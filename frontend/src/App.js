// D:\MyProjects\greenfield-scanwin\frontend\src\App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ScanPage from './pages/ScanPage';
import UserProfile from './pages/UserProfile';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFound from './components/NotFound';
import QRCodeScanner from './components/QRCodeScanner'; // --- NEW: Import the scanner component ---

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/start-scan" element={<QRCodeScanner />} /> {/* --- NEW: Add the route for the camera page --- */}
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/dashboard" element={<AnalyticsDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;