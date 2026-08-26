import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { api } from '../services/api';

const AuthContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('mock')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase client error:', e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify stored session on mount
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('axly_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.verifyAuth();
        setUser(response.user);
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        localStorage.removeItem('axly_auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase OAuth auth state change if configured
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          localStorage.setItem('axly_auth_token', session.access_token);
          try {
            const verified = await api.verifyAuth();
            setUser(verified.user);
          } catch (e) {
            console.error('Failed to verify Supabase session with backend:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('axly_auth_token');
          setUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  // Google OAuth Login
  const loginWithGoogle = async () => {
    setError(null);
    if (!supabase) {
      throw new Error('Supabase client is not configured with live credentials. Use quick login below for testing.');
    }
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (signInError) throw signInError;
  };

  // Fast Dev / Demo Login for local verification & testing
  const devLogin = async (email, role = 'user') => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.devLogin(email, role);
      localStorage.setItem('axly_auth_token', res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem('axly_auth_token');
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      loginWithGoogle,
      devLogin,
      logout,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
