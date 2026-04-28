import { useEffect, useState } from 'react';
import { Loader2, Plus, UserPlus, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Parceira = { id: string; nome: string; whatsapp: string | null; ativa: boolean };
type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  parceira_id: string | null;
};

export default function Parceiras() {
  const [parceiras, setParceiras] = useState<Parceira[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaNome, setNovaNome] = useState('');
  const [novaWa, setNovaWa] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const [{ data: pa }, { data: pr }] = await Promise.all([
      supabase.from('parceiras').select('*').order('nome'),
      supabase.from('profiles').select('id, user_id, display_name, parceira_id'),
    ]);
    setParceiras((pa ?? []) as Parceira[]);
    setProfiles((pr ?? []) as ProfileRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addParceira(e: React.FormEvent) {
    e.preventDefault();
    if (!novaNome.trim()) return;
    setAdding(true);
    const { error } = await supabase
      .from('parceiras')
      .insert({ nome: novaNome.trim(), whatsapp: novaWa.trim() || null });
    setAdding(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setNovaNome('');
      setNovaWa('');
      load();
    }
  }

  async function vincular(profileId: string, parceiraId: string | null) {
    const { error } = await supabase
      .from('profiles')
      .update({ parceira_id: parceiraId })
      .eq('id', profileId);
    if (error) {
      toast({ title: 'Erro ao vincular', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Vínculo atualizado' });
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-rosa" />
          Nova Parceira
        </h3>
        <form onSubmit={addParceira} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={novaNome}
            onChange={(e) => setNovaNome(e.target.value)}
            placeholder="Nome da parceira"
            className="flex-1"
          />
          <Input
            value={novaWa}
            onChange={(e) => setNovaWa(e.target.value)}
            placeholder="WhatsApp (opcional)"
            className="sm:w-48"
          />
          <Button type="submit" disabled={adding} className="bg-rosa hover:bg-rosa/90">
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Adicionar
          </Button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Parceiras ({parceiras.length})</h3>
        <div className="space-y-2">
          {parceiras.map((p) => {
            const linked = profiles.filter((pr) => pr.parceira_id === p.id);
            return (
              <div key={p.id} className="p-3 rounded-xl border border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-ink">{p.nome}</p>
                    <p className="text-xs text-ink-soft">{p.whatsapp ?? '—'}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-ink-soft">
                    {linked.length} usuário(s)
                  </span>
                </div>
                {linked.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {linked.map((u) => (
                      <li key={u.id} className="text-xs text-ink-soft pl-3 border-l-2 border-rosa/30">
                        {u.display_name || u.user_id.slice(0, 8)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4 flex items-center gap-2">
          <Link2 size={16} className="text-rosa" />
          Vincular Usuários a Parceiras
        </h3>
        <div className="space-y-2">
          {profiles.length === 0 && <p className="text-sm text-ink-soft">Nenhum usuário cadastrado.</p>}
          {profiles.map((pr) => (
            <div
              key={pr.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{pr.display_name || pr.user_id.slice(0, 8)}</p>
                <p className="text-[10px] text-ink-soft uppercase tracking-wider">
                  ID: {pr.user_id.slice(0, 8)}…
                </p>
              </div>
              <select
                value={pr.parceira_id ?? ''}
                onChange={(e) => vincular(pr.id, e.target.value || null)}
                className="text-sm border border-border rounded-md px-3 py-2 bg-white"
              >
                <option value="">— Sem vínculo —</option>
                {parceiras.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
