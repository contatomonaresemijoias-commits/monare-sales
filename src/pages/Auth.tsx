import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
  const { user, loading, isAdmin } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) nav(isAdmin ? '/admin' : '/', { replace: true });
  }, [user, loading, isAdmin, nav]);

  if (loading) return null;
  if (user) return <Navigate to={isAdmin ? '/admin' : '/'} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro ao autenticar');
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    'w-full rounded-2xl px-5 py-4 text-ink text-base outline-none transition-all duration-200 border border-border bg-white/80 placeholder:text-ink-soft/40 focus:border-rosa focus:ring-2 focus:ring-rosa/20';
  const labelBase = 'block text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft mb-2';

  return (
    <main className="min-h-screen bg-monare-gradient flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-px w-8 bg-rosa/40" />
            <ShieldCheck size={12} className="text-rosa" />
            <span className="text-rosa text-[10px] tracking-[0.3em] uppercase font-medium">Área Restrita</span>
            <ShieldCheck size={12} className="text-rosa" />
            <div className="h-px w-8 bg-rosa/40" />
          </div>
          <h1 className="font-serif text-5xl tracking-[0.15em] font-light text-ink uppercase">Monarê</h1>
          <p className="text-ink-soft text-xs tracking-[0.25em] uppercase mt-2">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-luxe overflow-hidden border border-white/60">
          <div className="h-1.5 w-full accent-bar" />
          <form onSubmit={submit} className="p-6 space-y-5">
            {mode === 'signup' && (
              <div>
                <label className={labelBase}>Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Silva"
                  required
                  className={inputBase}
                />
              </div>
            )}
            <div>
              <label className={labelBase}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                className={inputBase}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelBase}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={inputBase}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-rosa-gradient text-white text-sm font-semibold tracking-[0.1em] uppercase shadow-rosa active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="w-full text-center text-xs text-ink-soft hover:text-rosa transition-colors"
            >
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
