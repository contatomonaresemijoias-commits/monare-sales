import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ScrollProgress from '@/components/landing/ScrollProgress';
import SiteHeader from '@/components/landing/SiteHeader';
import HeroSection from '@/components/landing/HeroSection';
import BeneficiosSection from '@/components/landing/BeneficiosSection';
import DiferenciaisSection from '@/components/landing/DiferenciaisSection';
import SobreSection from '@/components/landing/SobreSection';
import DepoimentosSection from '@/components/landing/DepoimentosSection';
import ComoFuncionaSection from '@/components/landing/ComoFuncionaSection';
import GaleriaSection from '@/components/landing/GaleriaSection';
import CtaSection from '@/components/landing/CtaSection';
import FaqSection from '@/components/landing/FaqSection';
import WhatsAppFloat from '@/components/landing/WhatsAppFloat';
import usePageMeta from '@/hooks/usePageMeta';
import useScrollDepth from '@/hooks/useScrollDepth';
import { captureAttribution, track, EVENTS } from '@/lib/analytics';

/**
 * Landing institucional, servida na raiz do domínio. O formulário de inscrição
 * vive em /cadastro (src/pages/CadastroRevendedora.tsx) — aqui só há CTAs
 * apontando pra ele.
 */
export default function SejaRevendedora() {
  usePageMeta({
    title: 'Seja Representante Monarê — semijoias sem investimento inicial',
    description:
      'Revenda semijoias Monarê sem investir nada: peças em consignação, você paga só pelo que vender, com garantia de 1 ano, aplicativo exclusivo e suporte.',
  });
  useScrollDepth('seja-representante');

  useEffect(() => {
    captureAttribution();
    track(EVENTS.landingView, { pagina: 'seja-representante' });
    window.fbq?.('track', 'ViewContent', {
      content_name: 'Landing Representante',
      content_type: 'product',
    });
  }, []);

  return (
    <div className="min-h-screen bg-bege-light font-poppins text-ink antialiased">
      <ScrollProgress />
      <SiteHeader />

      <main>
        <HeroSection />
        <BeneficiosSection />
        <DiferenciaisSection />
        {/* Ordem das âncoras acompanha a ordem do menu: #home, #beneficios, #sobre. */}
        <SobreSection />
        <GaleriaSection />
        <ComoFuncionaSection />
        <DepoimentosSection />
        {/* O CTA fecha a página: quem leu o FAQ inteiro é quem está mais perto de decidir. */}
        <FaqSection />
        <CtaSection />
      </main>

      <footer className="border-t border-border px-6 pb-24 pt-12 text-center text-xs leading-relaxed tracking-[0.05em] text-ink-soft">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/termos-revendedora" className="text-rosa underline">
            Termos para Revendedoras
          </Link>
          <Link to="/politica-de-privacidade" className="text-rosa underline">
            Política de Privacidade
          </Link>
          <Link to="/auth" className="text-rosa underline">
            Já é revendedora? Entrar
          </Link>
        </div>
        <p className="mt-3">© Monarê Semijoias — dados protegidos conforme a LGPD</p>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
