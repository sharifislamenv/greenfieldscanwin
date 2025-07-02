// src/contexts/UserContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState({
    points: 0,
    level: 1,
    badges: [],
    scansToday: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchUserData(session.user.id);
      } else {
        setUser(null);
        setUserStats({
          points: 0,
          level: 1,
          badges: [],
          scansToday: 0
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('points, level, badges, scans_today')
        .eq('id', userId)
        .single();
      
      if (error) throw error;

      if (data) {
        setUserStats({
          points: data.points || 0,
          level: data.level || 1,
          badges: data.badges || [],
          scansToday: data.scans_today || 0
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      window.localStorage.removeItem('sb-data');
      window.localStorage.removeItem(`sb-${supabase.supabaseUrl}-auth-token`);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        userStats,
        isLoading,
        fetchUserData,
        handleLogout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};