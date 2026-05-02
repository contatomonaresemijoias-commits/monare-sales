import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Colunas reais da tabela profiles: id, email, role, parceira_id
type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  parceira_id: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: string[];
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
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  async function loadExtras(uid: string) {
    // Busca profile pelo id (que é o auth.uid)
    // Colunas reais: id, email, role, parceira_id
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, email, role, parceira_id')
      .eq('id', uid)
      .maybeSingle();

    setProfile(prof as Profile | null);

    // Role vem da tabela profiles.role E da tabela user_roles
    const profileRole = prof?.role ? [prof.role] : [];

    const { data: rs } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid);

    const userRoles = ((rs ?? []) as { role: string }[]).map((r) => r.role);

    // Combina roles de ambas as fontes sem duplicatas
    const allRoles = Array.from(new Set([...profileRole, ...userRoles]));
    setRoles(allRoles);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        await loadExtras(s.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      initialized.current = true;
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!initialized.current) return;

      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        await loadExtras(s.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refresh() {
    if (user) await loadExtras(user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAdmin = roles.includes('admin');

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        profile,
        roles,
        isAdmin,
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
