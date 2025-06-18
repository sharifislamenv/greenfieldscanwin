// D:\MyProjects\greenfield-scanwin\frontend\src\App.js

import React, { useState, useEffect } from 'react'; // Import hooks
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Import all your pages and components
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import CampaignManager from './components/CampaignManager';
import AuthPage from './pages/AuthPage';
import UserProfile from './pages/UserProfile';
import './App.css';

// --- (IMPROVEMENT 1) A ROBUST AUTH HOOK ---
// This hook properly listens for authentication changes.
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the initial user session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      // In a real app, you would get the role from user_metadata
      setIsAdmin(session?.user?.email === 'admin@example.com'); // Example admin check
      setLoading(false);
    };

    checkUser();

    // Listen for auth state changes (login, logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(session?.user?.email === 'admin@example.com'); // Example admin check
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading };
};


// --- (IMPROVEMENT 2) UPDATED PROTECTED ROUTE ---
// This component now waits for the auth check to complete.
const ProtectedRoute = ({ children, auth }) => {
  if (auth.loading) {
    // You can show a loading spinner here
    return <div>Loading...</div>;
  }
  return auth.user ? children : <Navigate to="/auth" replace />;
};

// --- (IMPROVEMENT 3) UPDATED ADMIN ROUTE ---
const AdminRoute = ({ children, auth }) => {
  if (auth.loading) {
    return <div>Loading...</div>;
  }
  // Checks for both user and admin status
  return auth.user && auth.isAdmin ? children : <Navigate to="/" replace />;
};


function App() {
  const auth = useAuth(); // Use the auth hook

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        <Route path="/scan" element={
          <ProtectedRoute auth={auth}>
            <ScanPage />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute auth={auth}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute auth={auth}>
            <UserProfile />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <AdminRoute auth={auth}>
            <CampaignManager />
          </AdminRoute>
        } />
        
        {/* Fallback 404 Route */}
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