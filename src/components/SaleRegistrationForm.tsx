import { useState, useCallback } from 'react';
import { ShieldCheck, Gem, Send, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { generateWarrantyCode, formatWhatsApp, getToday, getWarrantyExpiryISO } from '@/lib/monare';
import SuccessModal from './SuccessModal';

type ProdutoEstoque = { id: string; nome: string; sku: string; quantidade: number; preco_venda: number };
type SkuStatus = 'idle' | 'loading' | 'found' | 'not_in_showcase' | 'out_of_stock' | 'error';

export default function SaleRegistrationForm() {
  const { profile } = useAuth();
  const parceiraId = profile?.parceira_id ?? profile?.id ?? null;

  const [form, setForm] = useState({
    sku: '', cliente_nome: '', cliente_whatsapp: '', valor_venda: '', data_venda: getToday(), termo_aceito: false,
  });
  const [produto, setProduto] = useState<ProdutoEstoque | null>(null);
  const [skuStatus, setSkuStatus] = useState<SkuStatus>('idle');
  const [skuMessage, setSkuMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vendaFinalizada, setVendaFinalizada] = useState<any>(null);

  const lookupSKU = useCallback(
    async (sku: string) => {
      if (sku.length < 3 || !parceiraId) return;
      setSkuStatus('loading');
      try {
        const { data: prod } = await supabase.from('produtos').select('id, nome, sku, preco_venda').eq('sku', sku.toUpperCase()).eq('ativo', true).maybeSingle();
        if (!prod) {
          setSkuStatus('not_in_showcase'); setSkuMessage('Item não encontrado.'); return;
        }
        const { data: estoque } = await supabase.from('estoque_parceiras').select('quantidade').eq('parceira_id', parceiraId).eq('produto_id', prod.id).maybeSingle();
        if (!estoque || estoque.quantidade <= 0) {
          setSkuStatus('out_of_stock'); setSkuMessage('Estoque esgotado.'); return;
        }
        setProduto({ ...prod, quantidade: estoque.quantidade });
        setForm((f) => ({ ...f, valor_venda: prod.preco_venda?.toString() || '0' }));
        setSkuStatus('found');
      } catch { setSkuStatus('error'); }
    }, [parceiraId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produto || skuStatus !== 'found' || !form.termo_aceito) return;

    if (!parceiraId) {
      setErrors({ _global: 'Sessão inválida. Faça login novamente.' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('vendas').insert({
        parceira_id: parceiraId,
        produto_id: produto.id,
        produto_nome: produto.nome,
        valor_venda: parseFloat(form.valor_venda),
        cliente_nome: form.cliente_nome.trim(),
        cliente_whatsapp: form.cliente_whatsapp.replace(/\D/g, ''),
        data_venda: form.data_venda,
        codigo_garantia: generateWarrantyCode(),
        validade_garantia: getWarrantyExpiryISO(form.data_venda),
        termo_aceito: true,
      }).select().single();

      if (error) throw error;
      setVendaFinalizada(data);
    } catch (err: any) {
      setErrors({ _global: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-5xl text-ink uppercase tracking-tighter">Monarê</h1>
        <p className="text-ink-soft text-xs tracking-widest uppercase mt-2">Registro de Venda</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-luxe border p-6 space-y-5">
        {errors._global && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl">{errors._global}</div>}

        <div>
          <label className="text-xs font-semibold uppercase text-ink-soft mb-2 block">Código (SKU)</label>
          <input name="sku" value={form.sku} onChange={(e) => { setForm({...form, sku: e.target.value.toUpperCase()}); lookupSKU(e.target.value); }} className="w-full p-4 border rounded-2xl" placeholder="SKU001" />
          {skuStatus === 'found' && produto && <p className="mt-2 text-xs text-rosa font-bold uppercase">✓ {produto.nome}</p>}
        </div>

        <div><label className="text-xs font-semibold uppercase text-ink-soft mb-2 block">Cliente</label><input value={form.cliente_nome} onChange={(e) => setForm({...form, cliente_nome: e.target.value})} className="w-full p-4 border rounded-2xl" /></div>
        <div><label className="text-xs font-semibold uppercase text-ink-soft mb-2 block">WhatsApp</label><input value={form.cliente_whatsapp} onChange={(e) => setForm({...form, cliente_whatsapp: formatWhatsApp(e.target.value)})} className="w-full p-4 border rounded-2xl" /></div>
        <div><label className="text-xs font-semibold uppercase text-ink-soft mb-2 block">Valor</label><input value={form.valor_venda} className="w-full p-4 border rounded-2xl bg-gray-50" disabled /></div>

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input type="checkbox" checked={form.termo_aceito} onChange={(e) => setForm({...form, termo_aceito: e.target.checked})} className="mt-1" />
          <span className="text-[11px] text-ink-soft leading-tight">
            Confirmo entrega e aceitação da <span className="text-rosa font-semibold">garantia de 12 meses</span>.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || !produto || !form.termo_aceito}
          className="w-full bg-rosa text-white p-4 rounded-2xl font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? 'Processando...' : 'Finalizar Venda'}
        </button>
      </form>

      {vendaFinalizada && <SuccessModal venda={vendaFinalizada} onClose={() => setVendaFinalizada(null)} />}
    </div>
  );
}
