import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Profile = { id: string; role: string | null; parceira_id: string | null };

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadExtras(uid: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, role, parceira_id')
      .eq('id', uid)
      .maybeSingle();

    setProfile(prof as Profile | null);
  }

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          loadExtras(s.user.id).finally(() => {
            if (active) setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadExtras(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refresh() {
    if (user) await loadExtras(user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        profile,
        isAdmin: profile?.role === 'admin',
        loading,
        signOut,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
