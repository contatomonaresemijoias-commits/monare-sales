import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Gem, Instagram, Star, Droplets, Box, Loader2, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { INSTAGRAM_URL, getCertificateBaseUrl, formatDateBR, getWarrantyExpiryBR } from '@/lib/monare';
import { generateCertificatePDF, downloadPDF } from '@/lib/generateCertificate';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────────────────────────────────────
// Roteamento: decide qual view renderizar com base nos query params / path param
// ?codigo=X → certificado individual (lookup por codigo_garantia)
// ?venda=UUID → resumo da venda com todos os certificados
// /:id       → certificado individual (lookup por UUID interno, retrocompatível)
// ─────────────────────────────────────────────────────────────────────────────

export default function Certificate() {
  const { id: pathId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const codigoParam = searchParams.get('codigo');
  const vendaParam  = searchParams.get('venda');

  if (vendaParam) {
    return <GarantiaVendaPage uuid={vendaParam} />;
  }

  return (
    <CertificadoPage
      id={codigoParam ?? pathId ?? ''}
      useCodigo={!!codigoParam}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Certificado individual — visual inalterado em relação ao original
// ─────────────────────────────────────────────────────────────────────────────

const CARE_TIPS = [
  { icon: Droplets, text: 'Evite contato com perfumes, cremes e suor.' },
  { icon: Droplets, text: 'Não utilize no mar, piscina ou banho.' },
  { icon: Box,      text: 'Guarde individualmente em local seco e escuro.' },
  { icon: Star,     text: 'Limpe com pano macio e seco após o uso.' },
];

type Venda = {
  id: string;
  codigo_garantia: string;
  produto_nome: string;
  produto_sku: string;
  cliente_nome: string;
  consultora_nome: string;
  data_venda: string;
  created_at: string;
};

function CertificadoPage({ id, useCodigo }: { id: string; useCodigo: boolean }) {
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      let data: unknown;
      let error: unknown;

      if (useCodigo) {
        const res = await supabase.rpc('lookup_certificate_by_codigo', { _codigo: id } as any);
        data  = res.data;
        error = res.error;
      } else {
        const res = await supabase.rpc('lookup_certificate', { _id: id });
        data  = res.data;
        error = res.error;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) setNotFound(true);
      else setVenda(row as Venda);
      setLoading(false);
    })();
  }, [id, useCodigo]);

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

  const certUrl      = `${getCertificateBaseUrl()}?codigo=${venda.codigo_garantia}`;
  const purchaseDate = formatDateBR(venda.data_venda || venda.created_at);
  const expiryDate   = getWarrantyExpiryBR(venda.data_venda || venda.created_at);

  async function handleDownloadPDF() {
    if (!venda) return;
    setDownloading(true);
    try {
      const bytes = await generateCertificatePDF({
        clientName:  venda.cliente_nome,
        sku:         venda.produto_sku || '',
        purchaseDate,
        description: venda.produto_nome,
        consultora:  venda.consultora_nome || '',
      });
      downloadPDF(bytes, `Certificado_MONARE_${venda.codigo_garantia}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setDownloading(false);
    }
  }

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
              { label: 'Cliente',        value: venda.cliente_nome },
              { label: 'Peça',           value: venda.produto_nome },
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

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl border border-rosa text-rosa text-sm font-semibold tracking-wide active:scale-[0.98] transition-all disabled:opacity-60 mb-3"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? 'Gerando PDF…' : 'Baixar Certificado PDF'}
          </button>

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

// ─────────────────────────────────────────────────────────────────────────────
// Modo venda — painel de recibo com lista de certificados
// ─────────────────────────────────────────────────────────────────────────────

type CertItem = {
  codigo_garantia:   string;
  produto_nome:      string;
  validade_garantia: string;
};

type VendaInfo = {
  cliente_nome: string;
  data_compra:  string;
  certificados: CertItem[];
};

function GarantiaVendaPage({ uuid }: { uuid: string }) {
  const [venda, setVenda]     = useState<VendaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.rpc as any)('lookup_garantia_venda', { _uuid: uuid });

      const rows: Array<{
        cliente_nome:      string;
        data_compra:       string;
        codigo_garantia:   string;
        produto_nome:      string;
        validade_garantia: string;
      }> = Array.isArray(data) ? data : [];

      if (error || rows.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setVenda({
        cliente_nome: rows[0].cliente_nome,
        data_compra:  formatDateBR(rows[0].data_compra),
        certificados: rows.map((r) => ({
          codigo_garantia:   r.codigo_garantia,
          produto_nome:      r.produto_nome,
          validade_garantia: formatDateBR(r.validade_garantia),
        })),
      });
      setLoading(false);
    })();
  }, [uuid]);

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-monare-gradient">
        <Loader2 className="animate-spin text-rosa" size={32} />
      </div>
    );
  }

  // ── link inválido ─────────────────────────────────────────────────────────
  if (notFound || !venda) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-monare-gradient px-6 text-center">
        <Gem className="text-rosa mb-4" size={32} />
        <h1 className="font-serif text-3xl text-ink mb-2">Link inválido ou expirado.</h1>
        <p className="text-ink-soft text-sm">Verifique se o link foi copiado corretamente.</p>
      </div>
    );
  }

  // ── sucesso ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-monare-gradient px-4 py-12 flex flex-col items-center">

      {/* Documento único estilo recibo premium */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-luxe overflow-hidden border border-white/60">
        <div className="h-1.5 w-full accent-bar" />

        {/* ── Cabeçalho MONARÊ ── */}
        <div className="pt-10 pb-6 px-8 text-center border-b border-border/40">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-px w-10 bg-rosa/30" />
            <Gem size={11} className="text-rosa/60" />
            <div className="h-px w-10 bg-rosa/30" />
          </div>
          <h1 className="font-serif text-5xl tracking-[0.3em] font-light text-ink uppercase mb-1">
            Monarê
          </h1>
          <p className="text-rosa text-[10px] tracking-[0.35em] uppercase font-medium">
            Semijoias · Sorocaba
          </p>
          <div className="mt-5">
            <p className="text-rosa text-[11px] font-bold tracking-[0.25em] uppercase">
              Recibo de Garantia
            </p>
            <p className="text-ink-soft text-[11px] mt-0.5">
              Este documento registra sua compra e os certificados emitidos.
            </p>
          </div>
        </div>

        {/* ── Dados da compra ── */}
        <div className="px-8 py-6 border-b border-border/40">
          <p className="text-rosa text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
            Dados da Compra
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-bege-soft-gradient px-4 py-3">
              <p className="text-[9px] uppercase tracking-[0.25em] text-ink-soft mb-0.5">Nome da cliente</p>
              <p className="text-sm font-medium text-ink">{venda.cliente_nome}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-bege-soft-gradient px-4 py-3">
                <p className="text-[9px] uppercase tracking-[0.25em] text-ink-soft mb-0.5">Data da compra</p>
                <p className="text-sm font-medium text-ink">{venda.data_compra}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-bege-soft-gradient px-4 py-3">
                <p className="text-[9px] uppercase tracking-[0.25em] text-ink-soft mb-0.5">Peças</p>
                <p className="text-sm font-medium text-ink">
                  {venda.certificados.length} {venda.certificados.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Lista de certificados ── */}
        <div className="px-8 py-6">
          <p className="text-rosa text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
            Certificados Emitidos
          </p>

          <div className="space-y-3">
            {venda.certificados.map((cert, idx) => (
              <div
                key={cert.codigo_garantia}
                className="rounded-xl border border-border/60 overflow-hidden"
              >
                {/* Cabeçalho do item */}
                <div className="bg-bege-soft-gradient px-4 py-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-ink-soft">
                      Item {String(idx + 1).padStart(2, '0')}
                    </p>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-rosa font-semibold">
                      Garantia ativa
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-ink mt-0.5">{cert.produto_nome}</p>
                </div>

                {/* Dados do certificado */}
                <div className="px-4 py-3 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-ink-soft">Código</span>
                    <span className="font-mono text-sm font-bold text-ink tracking-widest">
                      {cert.codigo_garantia}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-ink-soft">Válido até</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rosa text-white tracking-wider">
                      {cert.validade_garantia}
                    </span>
                  </div>
                </div>

                {/* Botão */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => window.open(`/garantia?codigo=${cert.codigo_garantia}`, '_blank')}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-rosa/60 text-rosa text-[11px] font-semibold tracking-[0.15em] uppercase active:scale-[0.98] transition-all hover:bg-rosa hover:text-white"
                  >
                    <ExternalLink size={12} />
                    Ver Certificado
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Rodapé ── */}
        <div className="px-8 py-6 border-t border-border/40 text-center bg-bege-soft-gradient">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="h-px w-10 bg-border" />
            <Gem size={9} className="text-ink-soft" />
            <div className="h-px w-10 bg-border" />
          </div>
          <p className="text-ink-soft text-[9px] uppercase tracking-[0.25em]">Autenticidade Garantida</p>
          <p className="text-ink-soft text-[9px] uppercase tracking-[0.2em] mt-0.5">
            © 2026 Monarê Semijoias · Sorocaba, SP
          </p>
        </div>
      </div>
    </div>
  );
}
