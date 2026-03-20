import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, role?: 'admin' | 'coordinator' | 'micro') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      console.log('CONTEÚDO DO PERFIL SUPABASE:', data);
      setProfile(data);
    } catch (error) {
      console.error('ERRO CRÍTICO AO BUSCAR PERFIL:', error);
      // Fallback em caso de erro local para admin de teste
      if (userId === '00000000-0000-0000-0000-000000000000') {
          setProfile({
            id: userId,
            username: 'admin',
            full_name: 'Administrador Local',
            role: 'admin',
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const loginEmail = email === 'admin' ? 'admin@nivvio.com' : email;
      const { error } = await supabase.auth.signInWithPassword({ 
        email: loginEmail, 
        password 
      });

      if (error) {
        // Fallback para usuário de teste se a senha for "admin"
        if (email === 'admin' && password === 'admin') {
          const mockUser: User = {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'admin@nivvio.com',
            app_metadata: {},
            user_metadata: { username: 'admin' },
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as any;
          setUser(mockUser);
          setProfile({
            id: mockUser.id,
            username: 'admin',
            full_name: 'Administrador Local',
            role: 'admin',
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          setLoading(false);
          return { error: null };
        }
        return { error };
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, username: string, role: 'admin' | 'coordinator' | 'micro' = 'micro') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, username, full_name: username, role }]);

        if (profileError) return { error: profileError };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
