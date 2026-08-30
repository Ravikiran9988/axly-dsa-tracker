import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { api } from '../services/api';

const AuthContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('mock')) {
  try {
    // Let Supabase handle the OAuth PKCE callback automatically.
    // Do NOT manually exchange the `code` here: doing so can race with
    // Supabase's built-in URL detection and consume the verifier twice.
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
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
        if (isMounted) setUser(null);
        return null;
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function initAuth() {
      // Supabase automatically processes the OAuth PKCE callback because
      // detectSessionInUrl=true. We only read the resulting session here.
      if (supabase) {
        try {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (data.session?.access_token) {
            await syncBackendSession(data.session.access_token);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, '/');
            }
            return;
          }
        } catch (sbErr) {
          console.warn('Error reading Supabase session on init:', sbErr);
          if (isMounted) setError(sbErr.message || 'Authentication failed.');
        }
      }

      // 1. Check local backend session token.
      const token = localStorage.getItem('axly_auth_token');
      if (token) {
        await syncBackendSession(token);
        return;
      }

      if (isMounted) setLoading(false);
    }

    initAuth();

    // Supabase emits SIGNED_IN after it completes the OAuth callback.
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          await syncBackendSession(session.access_token);
          if (typeof window !== 'undefined' && window.location.search) {
            window.history.replaceState({}, document.title, '/');
          }
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
    }

    return () => { isMounted = false; };
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
        // Supabase returns to the deployed SPA root. Supabase itself handles
        // the PKCE code exchange and then emits SIGNED_IN.
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
      if (res.token) localStorage.setItem('axly_auth_token', res.token);
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
    try {
      const res = await api.signup({ name, email, password });
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Verify OTP
  const verifyOtp = async ({ email, otp }) => {
    setError(null);
    try {
      const res = await api.verifyOtp({ email, otp });
      if (res.token) localStorage.setItem('axly_auth_token', res.token);
      setUser(res.user);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resendOtp = async ({ email }) => {
    setError(null);
    try {
      return await api.resendOtp({ email });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

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

  const logout = async () => {
    localStorage.removeItem('axly_auth_token');
    if (supabase) await supabase.auth.signOut().catch(() => {});
    if (typeof window !== 'undefined') window.history.replaceState({}, '', '/');
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
