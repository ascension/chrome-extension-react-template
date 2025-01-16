import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export function useSupabaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));
      } catch (error) {
        setAuthState(prev => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Session check failed'),
          loading: false,
        }));
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      }));

      return data.session;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Login failed'),
        loading: false,
      }));
      throw error;
    }
  };

  const signup = async ({ email, password }: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setAuthState(prev => ({
        ...prev,
        session: data.session,
        user: data.session?.user ?? null,
        loading: false,
      }));

      return data.session;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Signup failed'),
        loading: false,
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await supabase.auth.signOut();
      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Logout failed'),
        loading: false,
      }));
      throw error;
    }
  };

  return {
    ...authState,
    login,
    signup,
    logout,
  };
}