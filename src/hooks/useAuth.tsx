import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
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

  // FIX: ref para evitar race condition entre onAuthStateChange e getSession.
  // Somente UMA das duas pode chamar loadExtras — a que chegar primeiro.
  // Depois que initialized = true, onAuthStateChange assume o controle exclusivo.
  const initialized = useRef(false);

  async function loadExtras(uid: string) {
    const [{ data: prof }, { data: rs }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, user_id, display_name, parceira_id')
        .eq('user_id', uid)
        .maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);

    setProfile(prof as Profile | null);
    setRoles(((rs ?? []) as { role: string }[]).map((r) => r.role));
  }

  useEffect(() => {
    // Passo 1: getSession resolve a sessão inicial.
    // É a única fonte de verdade no boot — onAuthStateChange não roda aqui.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        await loadExtras(s.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      initialized.current = true; // libera o listener para eventos futuros
      setLoading(false);
    });

    // Passo 2: onAuthStateChange lida APENAS com mudanças após o boot
    // (login, logout, refresh de token). Ignora o evento inicial porque
    // initialized.current ainda é false nesse momento.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!initialized.current) return; // ignora disparo do boot

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
    if (user) {
      await loadExtras(user.id);
    }
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
        isAdmin: roles.includes('admin'),
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
