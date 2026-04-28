import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Profile = { id: string; user_id: string; parceira_id: string | null; display_name: string | null };
type Role = 'admin' | 'parceira';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadExtras(uid: string, email?: string | null) {
    const [{ data: prof }, { data: rs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);
    let finalProfile = prof as Profile | null;

    // TESTE: força vínculo do coelho@monare.com à primeira parceira
    if (email === 'coelho@monare.com' && finalProfile && !finalProfile.parceira_id) {
      const { data: primeira } = await supabase
        .from('parceiras')
        .select('id')
        .order('nome')
        .limit(1)
        .maybeSingle();
      if (primeira?.id) {
        const { data: upd, error: updErr } = await supabase
          .from('profiles')
          .update({ parceira_id: primeira.id })
          .eq('id', finalProfile.id)
          .select()
          .maybeSingle();
        if (updErr) console.error('[useAuth] Falha ao auto-vincular parceira:', updErr);
        if (upd) finalProfile = upd as Profile;
      } else {
        console.error('[useAuth] Nenhuma parceira encontrada para auto-vínculo.');
      }
    }

    setProfile(finalProfile);
    setRoles(((rs ?? []) as { role: Role }[]).map((r) => r.role));
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
        setRoles([]);
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
