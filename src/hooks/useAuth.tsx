import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  telefone: string | null;
  parceira_id: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: string[];
  isAdmin: boolean;
  isRevendedora: boolean;
  isB2B: boolean;
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
  const currentUserId = useRef<string | null>(null);

  async function loadExtras(uid: string) {
    // Busca profile pelo user_id (= auth.uid)
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, telefone, parceira_id')
      .eq('user_id', uid)
      .maybeSingle();

    // Busca roles da tabela user_roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid);

    const p = prof as Profile | null;
    const r = (rolesData ?? []).map((row: any) => row.role as string);
    console.log('[useAuth] uid:', uid, 'profile:', prof, 'roles:', r);
    setProfile(p);
    setRoles(r);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      currentUserId.current = s?.user?.id ?? null;
      if (s?.user) {
        await loadExtras(s.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
      initialized.current = true;
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!initialized.current) return;

      const newUserId = s?.user?.id ?? null;
      const sameUser = newUserId !== null && newUserId === currentUserId.current;

      // Eventos silenciosos: só renovação de token ou revalidação do mesmo usuário
      if (event === 'TOKEN_REFRESHED' || (event === 'SIGNED_IN' && sameUser)) {
        setSession(s);
        return;
      }

      currentUserId.current = newUserId;
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

    return () => { sub.subscription.unsubscribe(); };
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
        roles,
        isAdmin: roles.includes('administrador'),
        isRevendedora: roles.includes('revendedora'),
        isB2B: roles.includes('b2b'),
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
