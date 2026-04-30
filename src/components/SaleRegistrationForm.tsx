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
      if (sku.length < 3) {
        setProduto(null); setSkuStatus('idle'); setSkuMessage(''); setForm((f) => ({ ...f, valor_venda: '' }));
        return;
      }
      if (!parceiraId) return;
      setSkuStatus('loading');
      try {
        const { data: prod } = await supabase.from('produtos').select('id, nome, sku, preco_venda').eq('sku', sku.toUpperCase()).eq('ativo', true).maybeSingle();
        if (!prod) {
          setProduto(null); setSkuStatus('not_in_showcase'); setSkuMessage('Item não consta no sistema.'); return;
        }
        const { data: estoque } = await supabase.from('estoque_parceiras').select('quantidade').eq('parceira_id', parceiraId).eq('produto_id', prod.id).maybeSingle();
        if (!estoque || estoque.quantidade <= 0) {
          setProduto({ ...prod, quantidade: 0 }); setSkuStatus('out_of_stock'); setSkuMessage('Estoque esgotado.'); return;
        }
        setProduto({ ...prod, quantidade: estoque.quantidade });
        setForm((f) => ({ ...f, valor_venda: prod.preco_venda?.toString() || '0' }));
        setSkuStatus('found'); setSkuMessage('');
      } catch {
        setSkuStatus('error'); setSkuMessage('Erro ao consultar mostruário.');
      }
    }, [parceiraId]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    let val: string | boolean = type === 'checkbox' ? checked : value;
    if (name === 'cliente_whatsapp') val = formatWhatsApp(value);
    if (name === 'sku') { val = (value as string).toUpperCase(); lookupSKU(val as string); }
    setForm((f) => ({ ...f, [name]: val }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sku || skuStatus !== 'found' || !form.termo_aceito) {
      setErrors({ _global: 'Verifique o SKU e aceite o termo de garantia.' });
      return;
    }
    setSubmitting(true);
    try {
      const codigo_garantia = generateWarrantyCode();
      const valor = parseFloat(form.valor_venda.replace(',', '.'));
      const whatsapp_limpo = form.cliente_whatsapp.replace(/\D/g, '');
      const validade_garantia = getWarrantyExpiryISO(form.data_venda);

      const { data, error } = await supabase.from('vendas').insert({
        vendedora_id: parceiraId, // <--- NOME CORRETO DA COLUNA
        produto_id: produto.id,
        produto_nome: produto.nome,
        valor_venda: valor,
        cliente_nome: form.cliente_nome.trim(),
        cliente_whatsapp: whatsapp_limpo,
        data_venda: form.data_venda,
        codigo_garantia: codigo_garantia,
        validade_garantia: validade_garantia,
        termo_aceito: true,
      }).select().single();

      if (error) throw error;

      setVendaFinalizada({
        ...data, cliente_nome: form.cliente_nome, cliente_whatsapp: whatsapp_limpo, produto_nome: produto.nome, sku: produto.sku, revendedora_nome: profile?.display_name || 'Equipe Monarê',
      });
      setForm({ sku: '', cliente_nome: '', cliente_whatsapp: '', valor_venda: '', data_venda: getToday(), termo_aceito: false });
      setProduto(null); setSkuStatus('idle');
    } catch (err: any) {
      console.error(err);
      setErrors({ _global: 'Erro ao registrar venda. Verifique o console.' });
    } finally { setSubmitting(false); }
  }

  const inputBase = 'w-full rounded-2xl px-5 py-4 text-ink text-base outline-none transition-all border border-border bg-white/80 focus:border-rosa';
  const labelBase = 'block text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft mb-2';

  return (
    <div className="w-full max-w-md mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-5xl text-ink uppercase">Monarê</h1>
        <p className="text-ink-soft text-xs tracking-[0.25em] uppercase mt-2">Registro de Venda</p>
      </div>
      <div className="bg-white rounded-3xl shadow-luxe border p-6 space-y-5">
        {errors._global && <p className="text-destructive text-sm text-center">{errors._global}</p>}
        <div>
          <label className={labelBase}>SKU</label>
          <input name="sku" value={form.sku} onChange={handleChange} className={inputBase} placeholder="SKU001" />
          {skuStatus === 'found' && produto && <p className="mt-2 text-sm text-rosa font-medium">✓ {produto.nome}</p>}
        </div>
        <div><label className={labelBase}>Cliente</label><input name="cliente_nome" value={form.cliente_nome} onChange={handleChange} className={inputBase} /></div>
        <div><label className={labelBase}>WhatsApp</label><input name="cliente_whatsapp" value={form.cliente_whatsapp} onChange={handleChange} className={inputBase} /></div>
        <div><label className={labelBase}>Valor</label><input name="valor_venda" value={form.valor_venda} className={inputBase + ' bg-gray-50'} disabled /></div>
        <div><label className={labelBase}>Data</label><input type="date" name="data_venda" value={form.data_venda} onChange={handleChange} className={inputBase} /></div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="termo_aceito" checked={form.termo_aceito} onChange={handleChange} className="mt-1" />
          <span className="text-xs text-ink-soft">Confirmo entrega e garantia de 12 meses.</span>
        </label>
        <button type="submit" disabled={submitting} className="w-full py-4 rounded-2xl bg-rosa text-white font-semibold uppercase transition-all active:scale-[0.98]">
          {submitting ? 'Registrando...' : 'Finalizar Venda'}
        </button>
      </div>
      {vendaFinalizada && <SuccessModal venda={vendaFinalizada} onClose={() => setVendaFinalizada(null)} />}
    </div>
  );
}