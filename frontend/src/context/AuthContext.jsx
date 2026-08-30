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
      // Supabase OAuth returns to the frontend with a PKCE `code`.
      // Exchange it explicitly before checking the session so Google OAuth
      // works reliably in production as well as localhost.
      if (supabase && typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');

          if (code) {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;

            if (data.session?.access_token) {
              await syncBackendSession(data.session.access_token);
              window.history.replaceState({}, document.title, '/');
              return;
            }
          }

          // Clean OAuth error parameters after Supabase has had a chance to
          // process them. Do not treat them as an authenticated session.
          const oauthError = url.searchParams.get('error');
          const oauthErrorDescription = url.searchParams.get('error_description');
          if (oauthError) {
            console.warn('OAuth redirect error:', oauthErrorDescription || oauthError);
            if (isMounted) {
              setError(oauthErrorDescription || oauthError);
              setLoading(false);
            }
            window.history.replaceState({}, document.title, '/login');
            return;
          }
        } catch (oauthErr) {
          console.warn('OAuth code exchange failed:', oauthErr.message);
          if (isMounted) {
            setError(oauthErr.message || 'Google authentication failed. Please try again.');
            setLoading(false);
          }
          window.history.replaceState({}, document.title, '/login');
          return;
        }
      }

      // 1. Check local backend session token first.
      const token = localStorage.getItem('axly_auth_token');
      if (token) {
        await syncBackendSession(token);
        return;
      }

      // 2. Check any existing Supabase session.
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

    // 3. Subscribe to Supabase auth state transitions.
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
        // Return to the SPA root. This avoids a Vercel 404 for /auth/callback;
        // initAuth() above exchanges the returned PKCE code for a session.
        redirectTo: window.location.origin
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

  // Email + Password Signup (does NOT set global loading — Signup manages its own)
  const signupWithEmail = async ({ name, email, password }) => {
    setError(null);
    try {
      const res = await api.signup({ name, email, password });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Verify OTP (only sets global loading on success to trigger auth transition)
  const verifyOtp = async ({ email, otp }) => {
    setError(null);
    try {
      const res = await api.verifyOtp({ email, otp });
      if (res.token) {
        localStorage.setItem('axly_auth_token', res.token);
      }
      setUser(res.user);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Resend OTP
  const resendOtp = async ({ email }) => {
    setError(null);
    try {
      const res = await api.resendOtp({ email });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
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
      verifyOtp,
      resendOtp,
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
