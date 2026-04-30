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
          setProduto(null); setSkuStatus('not_in_showcase'); setSkuMessage('Item não encontrado.'); return;
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); // Limpa erros anteriores

    // VALIDAÇÃO QUE TRAVAVA O BOTÃO:
    if (!produto || skuStatus !== 'found') {
      setErrors({ _global: 'Selecione um produto válido pelo SKU.' });
      return;
    }
    if (!form.cliente_nome || form.cliente_nome.length < 3) {
      setErrors({ _global: 'Digite o nome completo da cliente.' });
      return;
    }
    if (!form.termo_aceito) {
      setErrors({ _global: 'Você precisa aceitar os termos de garantia.' });
      return;
    }

    setSubmitting(true);
    try {
      const codigo_garantia = generateWarrantyCode();
      const valor = parseFloat(form.valor_venda.replace(',', '.'));
      const whatsapp_limpo = form.cliente_whatsapp.replace(/\D/g, '');
      const validade_garantia = getWarrantyExpiryISO(form.data_venda);

      const { data, error } = await supabase.from('vendas').insert({
        parceira_id: parceiraId, // Volta para o nome original que o banco aceitou antes
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

      // DISPARA O MODAL DE SUCESSO:
      setVendaFinalizada({
        ...data,
        cliente_nome: form.cliente_nome,
        cliente_whatsapp: whatsapp_limpo,
        produto_nome: produto.nome,
        sku: produto.sku,
        revendedora_nome: profile?.display_name || 'Equipe Monarê'
      });
      
      // Reseta o formulário
      setForm({ sku: '', cliente_nome: '', cliente_whatsapp: '', valor_venda: '', data_venda: getToday(), termo_aceito: false });
      setProduto(null);
      setSkuStatus('idle');

    } catch (err: any) {
      console.error('Erro detalhado:', err);
      setErrors({ _global: err.message || 'Erro ao registrar. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  }

  // Estilos mantidos para não quebrar seu layout quiet luxury
  const inputBase = 'w-full rounded-2xl px-5 py-4 text-ink text-base outline-none border border-border bg-white/80 focus:border-rosa transition-all';
  const labelBase = 'block text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft mb-2';

  return (
    <div className="w-full max-w-md mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-5xl text-ink uppercase tracking-tighter">Monarê</h1>
        <p className="text-ink-soft text-xs tracking-widest uppercase mt-2">Registro de Venda</p>
      </div>

      <div className="bg-white rounded-3xl shadow-luxe border p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errors._global && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center font-medium">
              {errors._global}
            </div>
          )}

          <div>
            <label className={labelBase}>Código do Produto (SKU)</label>
            <input name="sku" value={form.sku} onChange={handleChange} className={inputBase} placeholder="Ex: SKU001" />
            {skuStatus === 'found' && produto && <p className="mt-2 text-xs text-rosa font-bold uppercase tracking-wider">✓ {produto.nome}</p>}
            {skuStatus === 'loading' && <p className="mt-2 text-xs text-ink-soft animate-pulse">Consultando...</p>}
          </div>

          <div><label className={labelBase}>Nome da Cliente</label><input name="cliente_nome" value={form.cliente_nome} onChange={handleChange} className={inputBase} placeholder="Nome Completo" /></div>
          <div><label className={labelBase}>WhatsApp da Cliente</label><input name="cliente_whatsapp" value={form.cliente_whatsapp} onChange={handleChange} className={inputBase} placeholder="(15) 99999-9999" /></div>
          <div><label className={labelBase}>Valor da Venda (R$)</label><input name="valor_venda" value={form.valor_venda} className={inputBase + ' bg-gray-50 text-gray-400'} disabled /></div>
          
          <label className="flex items-start gap-3 cursor-pointer group pt-2">
            <input type="checkbox" name="termo_aceito" checked={form.termo_aceito} onChange={handleChange} className="mt-1 accent-rosa" />
            <span className="text-[11px] text-ink-soft leading-tight">Confirmo que a peça foi entregue e a cliente aceita a garantia de 12 meses.</span>
          </label>

          <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-rosa text-white text-sm font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {submitting ? 'Processando...' : 'Finalizar Venda'}
          </button>
        </form>
      </div>

      {vendaFinalizada && <SuccessModal venda={vendaFinalizada} onClose={() => setVendaFinalizada(null)} />}
    </div>
  );
}