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
    console.warn('Supabase client initialization warning:', e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function syncBackendSession(token) {
      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return null;
      }

      try {
        localStorage.setItem('axly_auth_token', token);
        const response = await api.verifyAuth();
        if (isMounted) {
          setUser(response.user);
          setError(null);
        }
        // Clean URL if currently on /auth/callback or containing hash tokens
        if (window.location.pathname.includes('/auth/callback') || window.location.hash.includes('access_token')) {
          window.history.replaceState({}, document.title, '/');
        }
        return response.user;
      } catch (err) {
        console.warn('Session verification failed, resetting token:', err.message);
        localStorage.removeItem('axly_auth_token');
        if (isMounted) {
          setUser(null);
        }
        return null;
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function initAuth() {
      // 1. Check local session token first for instantaneous session resolution
      const token = localStorage.getItem('axly_auth_token');
      if (token) {
        await syncBackendSession(token);
        return;
      }

      // 2. If Supabase is active, check active session from URL hash / local session
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await syncBackendSession(session.access_token);
            return;
          }
        } catch (sbErr) {
          console.warn('Error reading Supabase session on init:', sbErr);
        }
      }

      if (isMounted) setLoading(false);
    }

    initAuth();

    // 3. Subscribe to Supabase OAuth auth state transitions
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          await syncBackendSession(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('axly_auth_token');
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      });

      return () => {
        isMounted = false;
        authListener?.subscription?.unsubscribe();
      };
    } else {
      return () => {
        isMounted = false;
      };
    }
  }, []);

  // Google OAuth Login
  const loginWithGoogle = async () => {
    setError(null);
    if (!supabase) {
      throw new Error('Google authentication is currently unavailable. Please sign in with email and password.');
    }
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (signInError) throw signInError;
  };

  // Email + Password Login
  const loginWithEmail = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.token) {
        localStorage.setItem('axly_auth_token', res.token);
      }
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Email + Password Signup
  const signupWithEmail = async ({ name, email, password }) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.signup({ name, email, password });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fast Dev / Demo Login for local testing & development
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
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      loginWithGoogle,
      loginWithEmail,
      signupWithEmail,
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
