import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Gem, Instagram, Star, Droplets, Box, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { INSTAGRAM_URL, getCertificateBaseUrl, formatDateBR, getWarrantyExpiryBR } from '@/lib/monare';

const CARE_TIPS = [
  { icon: Droplets, text: 'Evite contato com perfumes, cremes e suor.' },
  { icon: Droplets, text: 'Não utilize no mar, piscina ou banho.' },
  { icon: Box, text: 'Guarde individualmente em local seco e escuro.' },
  { icon: Star, text: 'Limpe com pano macio e seco após o uso.' },
];

type Venda = {
  id: string;
  codigo_garantia: string;
  produto_nome: string;
  cliente_nome: string;
  data_venda: string;
  created_at: string;
};

export default function Certificate() {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('lookup_certificate', { _id: id });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) setNotFound(true);
      else setVenda(row as Venda);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-monare-gradient">
        <Loader2 className="animate-spin text-rosa" size={32} />
      </div>
    );
  }

  if (notFound || !venda) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-monare-gradient px-6 text-center">
        <Gem className="text-rosa mb-4" size={32} />
        <h1 className="font-serif text-3xl text-ink mb-2">Certificado não encontrado</h1>
        <p className="text-ink-soft text-sm mb-6">O código de garantia informado é inválido.</p>
        <Link to="/" className="text-rosa font-semibold underline">
          Voltar
        </Link>
      </div>
    );
  }

  const certUrl = `${getCertificateBaseUrl()}/${venda.id}`;
  const purchaseDate = formatDateBR(venda.data_venda || venda.created_at);
  const expiryDate = getWarrantyExpiryBR(venda.data_venda || venda.created_at);

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-12 bg-monare-gradient">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="h-px w-8 bg-rosa/40" />
          <Gem size={12} className="text-rosa" />
          <div className="h-px w-8 bg-rosa/40" />
        </div>
        <h1 className="font-serif text-5xl tracking-[0.25em] font-light text-ink uppercase">Monarê</h1>
        <p className="text-rosa text-[11px] tracking-[0.3em] uppercase font-medium mt-1">
          Semijoias · Sorocaba
        </p>
      </header>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-luxe overflow-hidden border border-white/60">
        <div className="h-1.5 w-full accent-bar" />
        <div className="p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={22} className="text-rosa" />
                <h2 className="text-base font-semibold text-ink tracking-wide">Certificado de Garantia</h2>
              </div>
              <p className="text-ink-soft text-xs">Documento de autenticidade digital</p>
            </div>
          </div>

          <div className="bg-bege-soft-gradient rounded-2xl px-5 py-3.5 mb-6 text-center">
            <p className="text-[9px] uppercase tracking-[0.25em] text-ink-soft mb-1">Código de Garantia</p>
            <p className="font-mono text-xl font-bold text-ink tracking-widest">{venda.codigo_garantia}</p>
          </div>

          <div className="space-y-3.5 border-t border-b border-border/50 py-5 mb-6">
            {[
              { label: 'Cliente', value: venda.cliente_nome },
              { label: 'Peça', value: venda.produto_nome },
              { label: 'Data da Compra', value: purchaseDate },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between">
                <span className="text-ink-soft text-xs uppercase tracking-wide">{label}</span>
                <span className="text-ink text-sm font-medium text-right max-w-[60%]">{value}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between pt-1 mt-1 border-t border-dashed border-border">
              <span className="text-ink-soft text-xs uppercase tracking-wide">Válida até</span>
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-rosa text-white tracking-wider">
                {expiryDate}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="p-4 rounded-2xl border border-border bg-white shadow-sm">
              <QRCodeSVG value={certUrl} size={110} fgColor="#374151" bgColor="transparent" level="M" />
            </div>
            <p className="text-[10px] text-ink-soft mt-2.5 uppercase tracking-[0.15em]">
              Aponte a câmera para validar
            </p>
          </div>

          <div className="bg-bege-soft-gradient rounded-2xl p-4 mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-rosa mb-3 flex items-center gap-2">
              <Gem size={11} />
              Cuidados com sua Joia
            </h3>
            <ul className="space-y-2">
              {CARE_TIPS.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Icon size={10} className="text-rosa mt-0.5 shrink-0" />
                  <span className="text-[11px] text-ink-soft leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-rosa-gradient text-white text-sm font-semibold tracking-wide shadow-rosa active:scale-[0.98] transition-all"
          >
            <Instagram size={16} />
            Siga a Monarê
          </a>
        </div>
      </div>

      <footer className="mt-10 text-center space-y-1">
        <div className="flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-border" />
          <Gem size={10} className="text-ink-soft" />
          <div className="h-px w-12 bg-border" />
        </div>
        <p className="text-ink-soft text-[10px] uppercase tracking-[0.2em] mt-2">Autenticidade Garantida</p>
        <p className="text-ink-soft text-[10px] uppercase tracking-[0.2em]">Monarê Semijoias · Sorocaba, SP</p>
      </footer>
    </div>
  );
}
