import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AppSelect } from '@/components/ui/app-select';

const VAZIO = { nome: '', email: '', senha: '', telefone: '', role: 'revendedora' };

export default function NovaUsuaria({ onCriada }: { onCriada?: () => void }) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState(VAZIO);
  const [busy, setBusy] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      toast({ title: 'Preencha Nome, E-mail e Senha', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-manage-users', {
      body: {
        action: 'create',
        email: form.email.trim(),
        password: form.senha,
        display_name: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        role: form.role,
      },
    });
    setBusy(false);

    if (error || data?.error) {
      toast({ title: 'Erro ao criar usuário', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Usuária criada com sucesso' });
    setForm(VAZIO);
    onCriada?.();
  }

  return (
    <section className="bg-white rounded-2xl border border-bege p-6">
      <h3 className="font-serif text-xl text-ink mb-1 flex items-center gap-2">
        <UserPlus size={16} className="text-rosa" />
        Nova Usuária
      </h3>
      <p className="text-xs text-ink-soft mb-5">
        Cadastro manual, para quem não veio pelo formulário público. Candidata que se
        inscreveu deve ser contratada pela aba Captação, para a ficha ficar vinculada à conta.
      </p>

      <form onSubmit={criar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Nome completo"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          required
        />
        <Input
          type="email"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <Input
          type="password"
          placeholder="Senha (mín. 6)"
          value={form.senha}
          onChange={(e) => setForm({ ...form, senha: e.target.value })}
          minLength={6}
          required
        />
        <Input
          type="tel"
          placeholder="Telefone (opcional)"
          value={form.telefone}
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
        />
        <div className="flex items-center gap-2 sm:col-span-2">
          <label className="text-xs text-ink-soft uppercase tracking-wider whitespace-nowrap">Tipo</label>
          <AppSelect
            value={form.role}
            onValueChange={(role) => setForm({ ...form, role })}
            options={[
              { value: 'revendedora', label: 'Revendedora' },
              { value: 'b2b', label: 'B2B' },
              ...(isAdmin ? [{ value: 'rh', label: 'RH' }] : []),
            ]}
            className="h-9 flex-1"
          />
        </div>
        <Button type="submit" disabled={busy} className="bg-rosa hover:bg-rosa/90 sm:col-span-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Criar Usuária
        </Button>
      </form>
    </section>
  );
}
