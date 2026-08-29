import {
  Briefcase,
  Gem,
  Handshake,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Imagens
//
// Enquanto `src` for `null`, a página desenha um placeholder no lugar exato da
// foto (mesmo tamanho e proporção), mostrando o nome de arquivo esperado.
// Para publicar uma foto: coloque o arquivo em `public/` no caminho de
// `fileName` e troque `src` para esse caminho começando com "/".
//
//   fileName: 'imagens/hero-destaque.jpg'  →  public/imagens/hero-destaque.jpg
//   src:      '/imagens/hero-destaque.jpg'
//
// Nada mais precisa mudar: os componentes já tratam os dois estados.
// ─────────────────────────────────────────────────────────────────────────────

export type LandingImage = {
  /** Caminho público final da imagem. `null` enquanto a foto não existe. */
  src: string | null;
  /** Texto alternativo — obrigatório, também usado no placeholder. */
  alt: string;
  /** Caminho esperado do arquivo dentro de `public/`. */
  fileName: string;
  /** Descrição do que entra ali, exibida no placeholder. */
  hint: string;
};

export const HERO_IMAGE: LandingImage = {
  src: '/imagens/landing/hero-destaque.jpg',
  alt: 'Representante Monarê com maleta de semijoias',
  fileName: 'imagens/landing/hero-destaque.jpg',
  hint: 'Foto de destaque (peça ou lifestyle)',
};

export const GALERIA_IMAGES: LandingImage[] = [
  {
    src: '/imagens/produtos/produto-1.png',
    alt: 'Brinco dourado Monarê em detalhe',
    fileName: 'imagens/produtos/produto-1.png',
    hint: 'Foto de produto',
  },
  {
    src: '/imagens/produtos/produto-2.png',
    alt: 'Colar e brinco dourado Monarê',
    fileName: 'imagens/produtos/produto-2.png',
    hint: 'Foto de produto',
  },
  {
    src: '/imagens/produtos/produto-3.png',
    alt: 'Brinco esculpido Monarê em destaque',
    fileName: 'imagens/produtos/produto-3.png',
    hint: 'Foto de produto',
  },
  {
    src: '/imagens/produtos/produto-4.png',
    alt: 'Brinco e colar prata Monarê',
    fileName: 'imagens/produtos/produto-4.png',
    hint: 'Foto de produto',
  },
  {
    src: '/imagens/produtos/produto-5.png',
    alt: 'Brinco de cristal prata e anéis Monarê em uso',
    fileName: 'imagens/produtos/produto-5.png',
    hint: 'Foto de produto',
  },
  {
    src: '/imagens/produtos/produto-6.png',
    alt: 'Brinco alongado dourado e anéis Monarê em uso',
    fileName: 'imagens/produtos/produto-6.png',
    hint: 'Foto de produto',
  },
];

/** Prints das avaliações recebidas de revendedoras. */
export const DEPOIMENTOS: LandingImage[] = Array.from({ length: 11 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    src: `/imagens/avaliacoes/avaliacao-${n}.png`,
    alt: `Avaliação de revendedora Monarê ${n}`,
    fileName: `imagens/avaliacoes/avaliacao-${n}.png`,
    hint: 'Print da avaliação',
  };
});

/**
 * Placeholders são ferramenta de desenvolvimento: em produção uma seção sem
 * nenhuma foto simplesmente não aparece, em vez de publicar caixas tracejadas.
 * Assim que o `src` de alguma imagem da seção for preenchido, ela volta sozinha.
 */
export const MOSTRAR_PLACEHOLDERS = !import.meta.env.PROD;

export function temFoto(imagem: LandingImage) {
  return Boolean(imagem.src);
}

/** A seção deve ser renderizada? Sim se há foto, ou se estamos em dev. */
export function deveRenderizar(imagens: LandingImage[]) {
  return imagens.some(temFoto) || MOSTRAR_PLACEHOLDERS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Navegação
// ─────────────────────────────────────────────────────────────────────────────

export type NavItem = {
  label: string;
  href: string;
  /** `anchor` rola na própria página, `route` navega, `external` sai do app. */
  kind: 'anchor' | 'route' | 'external' | 'disabled';
};

/** Formulário de inscrição, público. */
export const CADASTRO_PATH = '/cadastro';

/** App interno da revendedora. Só abre autenticado (ver RequireAuth). */
export const PAINEL_PATH = '/painel';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '#home', kind: 'anchor' },
  { label: 'Benefícios', href: '#beneficios', kind: 'anchor' },
  { label: 'Sobre nós', href: '#sobre', kind: 'anchor' },
  { label: 'Acesso Consultora', href: '/auth', kind: 'route' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo institucional
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Promessas verificáveis
//
// Estes dois valores são afirmações públicas: precisam ser verdade e continuar
// verdadeiras. Ficam isolados aqui pra serem revisados sem caçar texto solto.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TODO(Monarê): confirmar o número real de revendedoras ativas antes de
 * publicar. Se não houver número auditável, deixe `null` — a frase é exibida
 * sem a contagem em vez de afirmar algo que não se sustenta.
 */
export const REVENDEDORAS_ATIVAS: number | null = null;

/** Prazo prometido de retorno. Usado no FAQ e na confirmação do cadastro. */
export const PRAZO_RETORNO = 'até 1 dia útil';

export const INSTITUCIONAL = {
  lead: 'Empreenda com sofisticação, segurança e o suporte da Monarê.',
  body: 'Desenhe o seu próprio futuro financeiro compartilhando o brilho e a elegância de semijoias finas. Ao se tornar uma representante Monarê, você une a sua paixão por empreender a um modelo de negócio seguro, com alta lucratividade, garantia estendida e suporte operacional completo. Eleve a autoestima das suas clientes enquanto constrói sua independência com uma marca que cuida de cada detalhe por você.',
};

/**
 * Seção "Sobre nós" (âncora #sobre).
 *
 * O texto aqui foi escrito só com o que a marca já promete em outros pontos da
 * página (consignação, garantia de 1 ano, certificado, aplicativo, níveis de
 * carreira). Nada de ano de fundação, cidade ou porte — se quiserem contar essa
 * história, é informação que só a Monarê pode confirmar.
 */
export const SOBRE = {
  lead: 'Semijoias que sustentam um negócio — e uma estrutura que sustenta quem vende.',
  paragrafos: [
    'A Monarê existe para tirar o risco da revenda. Em vez de exigir que você compre um estoque antes da primeira venda, entregamos as peças em consignação: você trabalha com o mostruário completo, devolve o que não vendeu e paga apenas pelo que foi comercializado. O investimento inicial é zero porque a aposta é nossa, não sua.',
    'Cada peça sai com garantia de um ano, certificado e embalagem própria — o que a sua cliente leva para casa é a experiência inteira da marca, não só o produto. Do seu lado fica a estrutura: aplicativo exclusivo para acompanhar mostruário, vendas e comissão, reposição de peças, suporte da nossa equipe e um plano de crescimento com níveis claros, de Essência a Monarê Elite.',
    'É esse conjunto — a peça, o cuidado com a sua cliente e o suporte a você — que a gente chama de Monarê.',
  ],
  pilares: [
    {
      icon: Gem,
      title: 'Qualidade que se prova',
      text: 'Acabamento fino, garantia de 1 ano e certificado em cada peça. A sua cliente compra com segurança e você vende sem receio.',
    },
    {
      icon: Handshake,
      title: 'O risco é nosso',
      text: 'Consignação de verdade: você paga só o que vendeu e devolve o restante ao fim do ciclo, sem multa e sem burocracia.',
    },
    {
      icon: Sparkles,
      title: 'Ninguém cresce sozinha',
      text: 'Suporte da equipe, aplicativo exclusivo e um plano de carreira que vai do primeiro mostruário à sua própria equipe de revenda.',
    },
  ] as { icon: LucideIcon; title: string; text: string }[],
};

export const BENEFICIOS: string[] = [
  'Semijoias consignadas e com garantia',
  'Embalagens lindas e gratuitas',
  'Aplicativo exclusivo',
  'Premiações',
  'E muito mais!',
];

export const DIFERENCIAIS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Wallet,
    title: 'Sem investimento',
    text: 'Modelo consignado: você recebe as peças para trabalhar e paga apenas pelo que vender.',
  },
  {
    icon: ShieldCheck,
    title: 'Garantia de 1 ano',
    text: 'Peças com qualidade comprovada e fácil aceitação por parte das suas clientes.',
  },
  {
    icon: Smartphone,
    title: 'Suporte e aplicativo',
    text: 'Reposição de estoque, catálogo atualizado e um aplicativo exclusivo para acompanhar suas vendas.',
  },
  {
    icon: Briefcase,
    title: 'Escolha seu mostruário',
    text: 'Selecione parte das peças do seu mostruário de forma digital, direto pelo nosso catálogo.',
  },
  {
    icon: TrendingUp,
    title: 'Plano de crescimento',
    text: 'Avance nos níveis da marca e conquiste novos patamares: Essência, Seleção, Prestige, Signature, Legacy e Monarê Elite.',
  },
  {
    icon: Users,
    title: 'Plano de carreira',
    text: 'Desenvolva sua própria liderança, monte e gerencie sua própria equipe de revenda e lucre ainda mais sobre as metas atingidas.',
  },
];

export const ROADMAP: { badge: string; title: string; text: string }[] = [
  {
    badge: 'Passo 01',
    title: 'Inscrição Inicial',
    text: 'Preencha o formulário de cadastro com seus dados e perfil comercial em menos de 3 minutos, de forma simples.',
  },
  {
    badge: 'Passo 02',
    title: 'Análise Especializada',
    text: 'Avaliamos cuidadosamente as suas informações de mercado e nossa equipe de suporte entra em contato direto através do seu WhatsApp.',
  },
  {
    badge: 'Passo 03',
    title: 'Retirada do Kit Premium',
    text: 'Você tem acesso ao aplicativo e recebe sua maleta exclusiva com as semijoias selecionadas e prontas para comercialização.',
  },
  {
    badge: 'Passo 04',
    title: 'Retorno Seguro',
    text: 'Lucratividade real e acerto descomplicado. Ao fim do período do mostruário, você devolve as peças que não foram vendidas e paga estritamente pelo que foi comercializado — sem burocracia e sem risco para o seu bolso.',
  },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Qual o valor inicial para investir na revenda?',
    a: 'Zero! Você não precisa fazer nenhum investimento inicial para começar a revender Monarê. Nosso modelo foi desenhado para que você foque exclusivamente nas suas vendas e no seu crescimento, sem barreiras financeiras.',
  },
  {
    q: 'Quanto vou ter de lucro revendendo Monarê?',
    a: 'Suas comissões e margens de lucro são altamente competitivas no mercado premium. Além disso, fornecemos suporte completo — embalagens sofisticadas, acesso ao aplicativo exclusivo e certificados de garantia —, garantindo que você agregue o máximo de valor em cada atendimento.',
  },
  {
    q: 'Preciso ir até um showroom para retirar as peças?',
    a: 'Não é necessário. Pensando no seu conforto e na eficiência do seu negócio, enviamos os kits de semijoias diretamente para você, com toda a segurança e rastreamento que a Monarê oferece.',
  },
  {
    q: 'Como funciona o suporte para as minhas vendas?',
    a: 'Você nunca estará sozinha. Como revendedora Monarê, você tem acesso a um aplicativo exclusivo para controle de estoque e vendas, embalagens que transmitem a experiência de luxo da marca e certificados de garantia que dão credibilidade para suas clientes.',
  },
  {
    q: 'Como é feita a análise do meu cadastro?',
    a: `Após o envio do formulário de cadastro, nossa equipe realiza uma análise cuidadosa do seu perfil para garantir o alinhamento com o nosso ecossistema. Entramos em contato pelo WhatsApp em ${PRAZO_RETORNO} para dar o próximo passo.`,
  },
];

/** Mensagem pré-preenchida de quem prefere conversar antes de se cadastrar. */
export const WHATSAPP_MENSAGEM =
  'Olá! Vi a página de representantes da Monarê e gostaria de tirar uma dúvida antes de me cadastrar.';
