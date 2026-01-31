import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, UserProfile } from '@/lib/supabase';
import { syncUser } from '@/api/db';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      } else {
        setProfile({
          id: userId,
          username: email?.split('@')[0] || 'User',
          email: email || '',
          avatar_url: undefined
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };


  useEffect(() => {
    console.log("AuthProvider mounted");
    let mounted = true;

    // Safety timeout to prevent infinite loading
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth check timed out, forcing loading false");
        setLoading(false);
      }
    }, 5000);

    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthStateChange:", event, session?.user?.id);
        if (!mounted) return;

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Sync user in background to avoid blocking UI if RLS/DB fails
          syncUser(currentUser).catch(err => console.error("Background syncUser failed:", err));
          fetchProfile(currentUser.id, currentUser.email).catch(err => console.error("Background fetchProfile failed:", err));
        } else {
          setProfile(null);
        }

        if (mounted) setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log("getSession result:", session?.user?.id, error);
      if (!mounted) return;

      if (error) {
        console.error("Auth Session Error:", error);
      }
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        syncUser(currentUser).catch(err => console.error("Initial syncUser failed:", err));
        fetchProfile(currentUser.id, currentUser.email).catch(err => console.error("Initial fetchProfile failed:", err));
      }
    }).catch(err => {
      console.error("Unexpected Auth Error:", err);
    }).finally(() => {
      if (mounted) setLoading(false);
      clearTimeout(safetyTimer);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      // Set local states first to improve responsiveness
      setSession(null);
      setUser(null);
      setProfile(null);

      // Attempt backend sign out
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during backend sign out:", error);
    } finally {
      // ALWAYS redirect, even if something errored
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
