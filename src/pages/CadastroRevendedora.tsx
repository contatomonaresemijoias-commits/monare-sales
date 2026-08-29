import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gem, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatWhatsApp } from '@/lib/monare';
import { isValidCPF, maskCPF, isAdult, isValidEmail, isValidWhatsApp, maskCEP, fetchAddressByCEP } from '@/lib/validacao';
import { PRAZO_RETORNO } from '@/content/landing';
import { track, EVENTS } from '@/lib/analytics';
import { edgeErro } from '@/lib/edgeErro';
import { podeAvancarEtapa1 } from '@/lib/turnstile';
import usePageMeta from '@/hooks/usePageMeta';
import TurnstileWidget from '@/components/landing/TurnstileWidget';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const MODALIDADE_OPTIONS = [
  { value: 'maleta_consignada', label: 'Maleta consignada (recebe peças, repassa conforme venda)' },
  { value: 'mostruario', label: 'Mostruário' },
  { value: 'tenho_duvidas', label: 'Tenho dúvidas, quero conversar antes' },
];

const COMO_CONHECEU_OPTIONS = [
  { value: 'instagram_monare', label: 'Instagram da marca' },
  { value: 'indicacao_revendedora', label: 'Indicação de outra revendedora' },
  { value: 'indicacao_amiga', label: 'Indicação de uma amiga / conhecido' },
  { value: 'evento_feira', label: 'Evento ou feira' },
  { value: 'whatsapp_grupo', label: 'WhatsApp / grupo' },
  { value: 'outra', label: 'Outra' },
];

const CANAL_OPTIONS = [
  { value: 'instagram', label: 'Instagram / redes sociais' },
  { value: 'whatsapp', label: 'WhatsApp (rede pessoal)' },
  { value: 'presencial', label: 'Presencial (eventos, ambiente de trabalho)' },
  { value: 'outro', label: 'Outro' },
];

/**
 * A etapa 1 pede o mínimo (nome + WhatsApp) de propósito: assim que ela é
 * concluída a candidata já existe no banco como lead contatável. CPF, data de
 * nascimento, e-mail e endereço vêm depois — quem desistir na etapa 3 ainda
 * pode ser recuperada pela equipe, em vez de virar perda total.
 */
const STEP_LABELS = ['Contato', 'Seus dados', 'Endereço', 'Perfil comercial', 'Sobre você e termos'];
const ULTIMA_ETAPA = STEP_LABELS.length - 1;
const DRAFT_STORAGE_KEY = 'monare_seja_revendedora_draft';

type FormData = {
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  whatsapp: string;
  email: string;
  terms_accept: boolean;
  endereco_cep: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_estado: string;
  canal_principal: string;
  instagram_handle: string;
  modalidade_interesse: string;
  como_conheceu: string;
  como_conheceu_outra: string;
  trabalha_atualmente: string;
  experiencia_vendas: string;
  experiencia_vendas_detalhe: string;
  restricao_cpf: string;
  motivo_escolha: string;
  sonho_realizacao: string;
  lgpd_consent: boolean;
};

const FORM_INICIAL: FormData = {
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  whatsapp: '',
  email: '',
  terms_accept: false,
  endereco_cep: '',
  endereco_rua: '',
  endereco_numero: '',
  endereco_complemento: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  canal_principal: '',
  instagram_handle: '',
  modalidade_interesse: '',
  como_conheceu: '',
  como_conheceu_outra: '',
  trabalha_atualmente: '',
  experiencia_vendas: '',
  experiencia_vendas_detalhe: '',
  restricao_cpf: '',
  motivo_escolha: '',
  sonho_realizacao: '',
  lgpd_consent: false,
};

/** O rascunho é retomado pelo WhatsApp, que agora é o identificador da etapa 1. */
function readDraft(): { id: string; whatsapp: string } | null {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveDraft(id: string, whatsapp: string) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ id, whatsapp }));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

const labelBase = 'block text-sm text-ink mb-1.5';
const inputBase =
  'w-full rounded-xl px-4 py-2.5 text-ink text-base outline-none transition-all duration-200 border border-border bg-white/80 placeholder:text-ink-soft/40 focus:border-rosa focus:ring-2 focus:ring-rosa/20';
const legalLink = 'text-rosa underline underline-offset-2';

function OptionCard({
  value,
  label,
  selected,
}: {
  value: string;
  label: string;
  selected: boolean;
}) {
  return (
    <label
      htmlFor={value}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${selected ? 'border-rosa bg-rosa/5 ring-1 ring-rosa' : 'border-border bg-white/80 hover:border-rosa/50'
        }`}
    >
      <RadioGroupItem value={value} id={value} className="mt-0.5" />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}

export default function CadastroRevendedora() {
  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const cepAbortRef = useRef<AbortController | null>(null);

  usePageMeta({
    title: 'Cadastro de representante — Monarê Semijoias',
    description: 'Preencha seu cadastro para se tornar representante Monarê. Leva poucos minutos.',
  });

  useEffect(() => {
    track(EVENTS.cadastroView, {});
  }, []);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    const cep = form.endereco_cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    cepAbortRef.current?.abort();
    const controller = new AbortController();
    cepAbortRef.current = controller;

    (async () => {
      try {
        const endereco = await fetchAddressByCEP(cep, controller.signal);
        if (!endereco) {
          setStepError('CEP não encontrado. Confira os números digitados.');
          return;
        }
        setForm((f) => ({
          ...f,
          endereco_rua: endereco.rua || f.endereco_rua,
          endereco_bairro: endereco.bairro || f.endereco_bairro,
          endereco_cidade: endereco.cidade || f.endereco_cidade,
          endereco_estado: endereco.estado || f.endereco_estado,
        }));
        setStepError(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStepError('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
      }
    })();
  }, [form.endereco_cep]);

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (form.nome_completo.trim().length < 2) return 'Informe seu nome completo.';
      if (!isValidWhatsApp(form.whatsapp)) return 'Digite um WhatsApp válido com DDD e 9 dígitos.';
      if (!form.terms_accept) return 'Para continuar, confirme que leu e concorda com os termos e a política de privacidade.';
      if (!podeAvancarEtapa1(captchaToken)) return 'Aguarde a verificação de segurança concluir e tente novamente.';
      return null;
    }
    if (current === 1) {
      if (!isValidCPF(form.cpf)) return 'Este CPF não é válido. Confira os números digitados.';
      if (!isAdult(form.data_nascimento)) return 'É preciso ter 18 anos ou mais para se cadastrar.';
      if (!isValidEmail(form.email)) return 'Digite um e-mail válido (exemplo: nome@email.com).';
      return null;
    }
    if (current === 2) {
      if (form.endereco_cep.replace(/\D/g, '').length !== 8) return 'CEP inválido. Confira os números digitados.';
      if (!form.endereco_rua.trim()) return 'Informe a rua.';
      if (!form.endereco_numero.trim()) return 'Informe o número.';
      if (!form.endereco_bairro.trim()) return 'Informe o bairro.';
      if (!form.endereco_cidade.trim()) return 'Informe a cidade.';
      if (form.endereco_estado.trim().length !== 2) return 'Informe o estado (UF).';
      return null;
    }
    if (current === 3) {
      if (!form.instagram_handle.trim()) return 'Informe seu @ do Instagram.';
      if (!form.modalidade_interesse) return 'Selecione a modalidade de parceria de interesse.';
      if (!form.como_conheceu) return 'Selecione como você conheceu a marca.';
      if (form.como_conheceu === 'outra' && !form.como_conheceu_outra.trim()) return 'Conte pra gente como conheceu a marca.';
      if (!form.trabalha_atualmente.trim()) return 'Conte se você trabalha atualmente.';
      if (!form.experiencia_vendas) return 'Informe se você possui experiência com vendas.';
      if (!form.experiencia_vendas_detalhe.trim()) return 'Conte um pouco sobre sua experiência com vendas.';
      return null;
    }
    if (!form.restricao_cpf.trim()) return 'Conte se você possui restrição no CPF.';
    if (!form.motivo_escolha.trim()) return 'Conte por que devemos escolher seu cadastro.';
    if (!form.sonho_realizacao.trim()) return 'Conte sobre seu sonho ou realização.';
    if (!form.lgpd_consent) return 'Para prosseguir, é necessário autorizar o uso dos dados conforme a LGPD.';
    return null;
  }

  async function invoke(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('reseller-registration', { body });
    if (error || data?.error) {
      // Sem isto, a recusa do servidor (campo inválido, limite de tentativas)
      // chegaria na tela como "erro genérico" e a candidata não saberia o que
      // corrigir — nem nós, ao investigar um 400 no console.
      const mensagem = await edgeErro(error, data);
      throw new Error(mensagem || 'Não foi possível salvar agora. Tente novamente em instantes.');
    }
    return data;
  }

  async function handleNext() {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      track(EVENTS.cadastroErro, { etapa: step + 1, campo: err });
      return;
    }
    setStepError(null);
    setBusy(true);
    try {
      if (step === 0) {
        const draft = readDraft();
        const whatsappDigits = form.whatsapp.replace(/\D/g, '');
        const data = await invoke({
          action: 'start',
          existing_id: draft?.whatsapp === whatsappDigits ? draft.id : null,
          nome_completo: form.nome_completo,
          whatsapp: form.whatsapp,
          terms_accept: form.terms_accept,
          turnstile_token: captchaToken,
        });
        setDraftId(data.id);
        saveDraft(data.id, whatsappDigits);
      } else if (step === 1) {
        await invoke({
          action: 'update_step',
          id: draftId,
          step: 2,
          cpf: form.cpf,
          data_nascimento: form.data_nascimento,
          email: form.email,
        });
      } else if (step === 2) {
        await invoke({
          action: 'update_step',
          id: draftId,
          step: 3,
          endereco_cep: form.endereco_cep,
          endereco_rua: form.endereco_rua,
          endereco_numero: form.endereco_numero,
          endereco_complemento: form.endereco_complemento,
          endereco_bairro: form.endereco_bairro,
          endereco_cidade: form.endereco_cidade,
          endereco_estado: form.endereco_estado,
        });
      } else if (step === 3) {
        await invoke({
          action: 'update_step',
          id: draftId,
          step: 4,
          canal_principal: form.canal_principal || null,
          instagram_handle: form.instagram_handle,
          modalidade_interesse: form.modalidade_interesse,
          como_conheceu: form.como_conheceu,
          como_conheceu_outra: form.como_conheceu_outra,
          trabalha_atualmente: form.trabalha_atualmente,
          experiencia_vendas: form.experiencia_vendas,
          experiencia_vendas_detalhe: form.experiencia_vendas_detalhe,
        });
      }
      track(EVENTS.cadastroEtapa, { etapa: step + 1, nome: STEP_LABELS[step] });
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      // O token do Turnstile é de uso único: se o `start` falhou, ele já
      // queimou. Sem um widget novo a retentativa cairia no mesmo erro.
      if (step === 0) {
        setCaptchaToken(null);
        setCaptchaResetKey((k) => k + 1);
      }
      setStepError(err instanceof Error ? err.message : 'Não foi possível salvar agora. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  function handleBack() {
    setStepError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function getMetaCookie(name: string): string | undefined {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match?.[1] || undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep(ULTIMA_ETAPA);
    if (err) {
      setStepError(err);
      track(EVENTS.cadastroErro, { etapa: ULTIMA_ETAPA + 1, campo: err });
      return;
    }
    setStepError(null);
    setBusy(true);
    try {
      await invoke({
        action: 'complete',
        id: draftId,
        nome_completo: form.nome_completo,
        cpf: form.cpf,
        data_nascimento: form.data_nascimento,
        whatsapp: form.whatsapp,
        email: form.email,
        terms_accept: form.terms_accept,
        endereco_cep: form.endereco_cep,
        endereco_rua: form.endereco_rua,
        endereco_numero: form.endereco_numero,
        endereco_complemento: form.endereco_complemento,
        endereco_bairro: form.endereco_bairro,
        endereco_cidade: form.endereco_cidade,
        endereco_estado: form.endereco_estado,
        canal_principal: form.canal_principal || null,
        instagram_handle: form.instagram_handle,
        modalidade_interesse: form.modalidade_interesse,
        como_conheceu: form.como_conheceu,
        como_conheceu_outra: form.como_conheceu_outra,
        trabalha_atualmente: form.trabalha_atualmente,
        experiencia_vendas: form.experiencia_vendas,
        experiencia_vendas_detalhe: form.experiencia_vendas_detalhe,
        restricao_cpf: form.restricao_cpf,
        motivo_escolha: form.motivo_escolha,
        sonho_realizacao: form.sonho_realizacao,
        lgpd_consent: form.lgpd_consent,
        fbp: getMetaCookie('_fbp'),
        fbc: getMetaCookie('_fbc'),
        page_url: window.location.href,
      });
      clearDraft();
      track(EVENTS.cadastroEnviado, { canal: form.canal_principal || null, modalidade: form.modalidade_interesse });
      window.fbq?.('track', 'Lead', {
        content_name: 'Cadastro Representante',
        content_category: form.modalidade_interesse,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setStepError(
        err instanceof Error ? err.message : 'Não foi possível finalizar seu cadastro agora. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-monare-gradient">
      <section className="px-5 pt-8 pb-10 sm:pt-10 sm:pb-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Coluna esquerda: apresentação */}
          <div className="text-center lg:text-left">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-rosa transition-colors mb-5"
            >
              <ArrowLeft size={14} />
              Voltar
            </Link>
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-2 lg:mb-1.5">
              <div className="h-px w-8 bg-rosa/40" />
              <Gem size={12} className="text-rosa" />
              <div className="h-px w-8 bg-rosa/40" />
            </div>
            <h1 className="font-serif text-4xl lg:text-3xl tracking-[0.15em] font-light text-ink uppercase mb-1.5">Monarê</h1>
            <p className="text-rosa text-[11px] tracking-[0.3em] uppercase font-medium mb-4 lg:mb-3">Semijoias</p>
            <h2 className="font-serif text-3xl lg:text-2xl text-ink leading-tight mb-3">
              Transforme seu círculo social em <span className="italic text-rosa">uma oportunidade</span>
            </h2>
            <p className="text-ink-soft text-sm max-w-md mx-auto lg:mx-0 leading-relaxed">
              Mesmo sem experiência. Você recebe uma seleção de semijoias pra vender e paga apenas pelo que
              comercializar — sem risco, com toda a elegância da marca ao seu favor.
            </p>
          </div>

          {/* Coluna direita: formulário */}
          <div className="max-w-md mx-auto w-full lg:mx-0 lg:max-w-none">
            {submitted ? (
              <div className="bg-white rounded-3xl shadow-luxe border border-white/60 p-8 text-center">
                <h3 className="font-serif text-2xl text-ink mb-3">Cadastro recebido</h3>
                <p className="text-ink-soft text-sm leading-relaxed mb-6">
                  Obrigada pelo seu interesse em fazer parte da Monarê. Vamos analisar seu perfil com atenção e
                  entraremos em contato pelo WhatsApp informado em {PRAZO_RETORNO}.
                </p>
                <Link to="/" className="text-rosa text-sm underline">
                  Voltar para a página inicial
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-luxe overflow-hidden border border-white/60">
                <div className="h-1.5 w-full accent-bar" />
                <div className="p-5 sm:p-6">
                  <div className="text-center mb-5">
                    <h3 className="font-serif text-xl text-ink mb-1">Cadastro de representante</h3>
                    <p className="text-ink-soft text-xs">
                      Preencha com atenção. Todas as informações são tratadas com sigilo, conforme a LGPD.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-soft mb-2">
                    <span>{STEP_LABELS[step]}</span>
                    <span>
                      Etapa {step + 1} de {STEP_LABELS.length}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-border/60 mb-5 overflow-hidden">
                    <div
                      className="h-full bg-rosa transition-all duration-300"
                      style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
                    />
                  </div>

                  <form
                    onSubmit={step === ULTIMA_ETAPA ? handleSubmit : (e) => e.preventDefault()}
                    className="space-y-4"
                  >
                    {/* ── Etapa 1: contato ── */}
                    {step === 0 && (
                      <div className="space-y-3">
                        <div>
                          <label className={labelBase}>
                            Nome completo <span className="text-rosa">*</span>
                          </label>
                          <Input
                            className={inputBase}
                            value={form.nome_completo}
                            onChange={(e) => set('nome_completo', e.target.value)}
                            placeholder="Seu nome como no documento"
                          />
                        </div>
                        <div>
                          <label className={labelBase}>
                            WhatsApp <span className="text-rosa">*</span>
                          </label>
                          <p className="text-xs text-ink-soft -mt-1 mb-2">É por aqui que vamos falar com você</p>
                          <Input
                            className={inputBase}
                            value={form.whatsapp}
                            onChange={(e) => set('whatsapp', formatWhatsApp(e.target.value))}
                            placeholder="(15) 9 9999-9999"
                            inputMode="numeric"
                          />
                        </div>
                        {/* <div className="bg-bege-soft-gradient rounded-2xl p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rosa mb-1.5">Importante</p>
                          <p className="text-xs text-ink-soft leading-relaxed">
                            Os dados informados serão usados exclusivamente para análise da sua solicitação de
                            revendedora Monarê e contato sobre o andamento do processo. Saiba mais na{' '}
                            <Link to="/politica-de-privacidade" className={legalLink} target="_blank">
                              Política de Privacidade
                            </Link>
                            .
                          </p>
                        </div> */}
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox
                            checked={form.terms_accept}
                            onCheckedChange={(v) => set('terms_accept', v === true)}
                            className="mt-0.5"
                          />
                          <span className="text-xs text-ink-soft leading-relaxed">
                            Confirmo que li e concordo com os{' '}
                            <Link to="/termos-revendedora" className={legalLink} target="_blank">
                              Termos para Revendedoras Monarê
                            </Link>{' '}
                            e com a{' '}
                            <Link to="/politica-de-privacidade" className={legalLink} target="_blank">
                              Política de Privacidade
                            </Link>
                            , autorizando o uso dos meus dados para análise do cadastro.
                          </span>
                        </label>
                        <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaResetKey} />
                      </div>
                    )}

                    {/* ── Etapa 2: dados pessoais ── */}
                    {step === 1 && (
                      <div className="space-y-3">
                        <div>
                          <label className={labelBase}>
                            CPF <span className="text-rosa">*</span>
                          </label>
                          <Input
                            className={inputBase}
                            value={form.cpf}
                            onChange={(e) => set('cpf', maskCPF(e.target.value))}
                            placeholder="000.000.000-00"
                            inputMode="numeric"
                            maxLength={14}
                          />
                        </div>
                        <div>
                          <label className={labelBase}>
                            Data de nascimento <span className="text-rosa">*</span>
                          </label>
                          <p className="text-xs text-ink-soft -mt-1 mb-2">É preciso ter 18 anos ou mais para se cadastrar</p>
                          <Input
                            type="date"
                            className={inputBase}
                            value={form.data_nascimento}
                            onChange={(e) => set('data_nascimento', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className={labelBase}>
                            E-mail <span className="text-rosa">*</span>
                          </label>
                          <Input
                            type="email"
                            className={inputBase}
                            value={form.email}
                            onChange={(e) => set('email', e.target.value)}
                            placeholder="voce@exemplo.com"
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Etapa 3: endereço ── */}
                    {step === 2 && (
                      <div className="space-y-3">
                        <div>
                          <label className={labelBase}>
                            CEP <span className="text-rosa">*</span>
                          </label>
                          <Input
                            className={inputBase}
                            value={form.endereco_cep}
                            onChange={(e) => set('endereco_cep', maskCEP(e.target.value))}
                            placeholder="00000-000"
                            inputMode="numeric"
                            maxLength={9}
                          />
                        </div>
                        <div>
                          <label className={labelBase}>
                            Rua <span className="text-rosa">*</span>
                          </label>
                          <Input className={inputBase} value={form.endereco_rua} onChange={(e) => set('endereco_rua', e.target.value)} placeholder="Nome da rua" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelBase}>
                              Número <span className="text-rosa">*</span>
                            </label>
                            <Input className={inputBase} value={form.endereco_numero} onChange={(e) => set('endereco_numero', e.target.value)} placeholder="123" />
                          </div>
                          <div>
                            <label className={labelBase}>Complemento</label>
                            <Input
                              className={inputBase}
                              value={form.endereco_complemento}
                              onChange={(e) => set('endereco_complemento', e.target.value)}
                              placeholder="Apto, bloco (opcional)"
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelBase}>
                            Bairro <span className="text-rosa">*</span>
                          </label>
                          <Input className={inputBase} value={form.endereco_bairro} onChange={(e) => set('endereco_bairro', e.target.value)} placeholder="Seu bairro" />
                        </div>
                        <div className="grid grid-cols-[1fr_100px] gap-4">
                          <div>
                            <label className={labelBase}>
                              Cidade <span className="text-rosa">*</span>
                            </label>
                            <Input className={inputBase} value={form.endereco_cidade} onChange={(e) => set('endereco_cidade', e.target.value)} placeholder="Sua cidade" />
                          </div>
                          <div>
                            <label className={labelBase}>
                              UF <span className="text-rosa">*</span>
                            </label>
                            <Input
                              className={inputBase}
                              value={form.endereco_estado}
                              onChange={(e) => set('endereco_estado', e.target.value.toUpperCase())}
                              placeholder="SP"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Etapa 4: perfil comercial ── */}
                    {step === 3 && (
                      <div className="space-y-4">
                        <div>
                          <label className={labelBase}>Qual é o seu principal canal de vendas?</label>
                          <RadioGroup value={form.canal_principal} onValueChange={(v) => set('canal_principal', v)} className="gap-2.5">
                            {CANAL_OPTIONS.map((o) => (
                              <OptionCard key={o.value} value={o.value} label={o.label} selected={form.canal_principal === o.value} />
                            ))}
                          </RadioGroup>
                        </div>
                        <div>
                          <label className={labelBase}>
                            Qual é o seu @ do Instagram? <span className="text-rosa">*</span>
                          </label>
                          <Input className={inputBase} value={form.instagram_handle} onChange={(e) => set('instagram_handle', e.target.value)} placeholder="@seuusuario" />
                        </div>
                        <div>
                          <label className={labelBase}>
                            Qual modalidade de parceria você tem interesse? <span className="text-rosa">*</span>
                          </label>
                          <RadioGroup value={form.modalidade_interesse} onValueChange={(v) => set('modalidade_interesse', v)} className="gap-2.5">
                            {MODALIDADE_OPTIONS.map((o) => (
                              <OptionCard key={o.value} value={o.value} label={o.label} selected={form.modalidade_interesse === o.value} />
                            ))}
                          </RadioGroup>
                        </div>
                        <div>
                          <label className={labelBase}>
                            Como você conheceu a marca? <span className="text-rosa">*</span>
                          </label>
                          <RadioGroup value={form.como_conheceu} onValueChange={(v) => set('como_conheceu', v)} className="gap-2.5">
                            {COMO_CONHECEU_OPTIONS.map((o) => (
                              <OptionCard key={o.value} value={o.value} label={o.label} selected={form.como_conheceu === o.value} />
                            ))}
                          </RadioGroup>
                          {form.como_conheceu === 'outra' && (
                            <Input
                              className={`${inputBase} mt-3`}
                              value={form.como_conheceu_outra}
                              onChange={(e) => set('como_conheceu_outra', e.target.value)}
                              placeholder="Conte pra gente"
                            />
                          )}
                        </div>
                        <div>
                          <label className={labelBase}>
                            Você trabalha atualmente? Se sim, onde e com o quê? <span className="text-rosa">*</span>
                          </label>
                          <Textarea className={inputBase} value={form.trabalha_atualmente} onChange={(e) => set('trabalha_atualmente', e.target.value)} placeholder="Conte pra gente" />
                        </div>
                        <div>
                          <label className={labelBase}>
                            Você possui experiência com vendas? <span className="text-rosa">*</span>
                          </label>
                          <RadioGroup value={form.experiencia_vendas} onValueChange={(v) => set('experiencia_vendas', v)} className="flex flex-row gap-3">
                            <OptionCard value="sim" label="Sim" selected={form.experiencia_vendas === 'sim'} />
                            <OptionCard value="nao" label="Não" selected={form.experiencia_vendas === 'nao'} />
                          </RadioGroup>
                        </div>
                        <div>
                          <label className={labelBase}>
                            Se sim, nos conte o que você vende ou vendeu <span className="text-rosa">*</span>
                          </label>
                          <Textarea
                            className={inputBase}
                            value={form.experiencia_vendas_detalhe}
                            onChange={(e) => set('experiencia_vendas_detalhe', e.target.value)}
                            placeholder="Conte pra gente"
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Etapa 5: sobre você e LGPD ── */}
                    {step === 4 && (
                      <div className="space-y-4">
                        <div>
                          <label className={labelBase}>
                            Você possui restrição no seu CPF? Se sim, nos diga aonde. <span className="text-rosa">*</span>
                          </label>
                          <p className="text-xs text-ink-soft -mt-1 mb-2">Pergunta não eliminatória</p>
                          <Textarea className={inputBase} value={form.restricao_cpf} onChange={(e) => set('restricao_cpf', e.target.value)} placeholder="Conte pra gente" />
                        </div>
                        <div>
                          <label className={labelBase}>
                            Nosso processo é concorrido. Por que devemos escolher o seu cadastro? <span className="text-rosa">*</span>
                          </label>
                          <Textarea className={inputBase} value={form.motivo_escolha} onChange={(e) => set('motivo_escolha', e.target.value)} placeholder="Conte pra gente" />
                        </div>
                        <div>
                          <label className={labelBase}>
                            Você possui algum sonho ou realização que queira conquistar com as vendas? <span className="text-rosa">*</span>
                          </label>
                          <Textarea className={inputBase} value={form.sonho_realizacao} onChange={(e) => set('sonho_realizacao', e.target.value)} placeholder="Conte pra gente" />
                        </div>
                        <div className="bg-bege-soft-gradient rounded-2xl p-4">
                          <p className={labelBase}>
                            Autorização de dados (LGPD) <span className="text-rosa">*</span>
                          </p>
                          <p className="text-xs text-ink-soft leading-relaxed mb-3">
                            Você autoriza o armazenamento e utilização dos seus dados pessoais exclusivamente para fins
                            de gestão da parceria, nos termos da LGPD (Lei 13.709/2018)?
                          </p>
                          <RadioGroup value={form.lgpd_consent ? 'sim' : ''} onValueChange={(v) => set('lgpd_consent', v === 'sim')} className="gap-2.5">
                            <OptionCard value="sim" label="Sim, autorizo" selected={form.lgpd_consent} />
                          </RadioGroup>
                        </div>
                      </div>
                    )}

                    {stepError && <p className="text-destructive text-sm text-center">{stepError}</p>}

                    <div className="flex gap-3 pt-2">
                      {step > 0 && (
                        <button
                          type="button"
                          onClick={handleBack}
                          disabled={busy}
                          className="flex-none px-5 py-3.5 rounded-2xl border border-border text-ink text-xs font-semibold tracking-[0.1em] uppercase transition-colors hover:border-rosa/60 disabled:opacity-50"
                        >
                          Voltar
                        </button>
                      )}
                      {step < ULTIMA_ETAPA ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={busy}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-ink text-white text-xs font-semibold tracking-[0.1em] uppercase transition-colors hover:bg-ink/90 disabled:opacity-60"
                        >
                          {busy && <Loader2 size={14} className="animate-spin" />}
                          Continuar
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={busy}
                          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rosa-gradient text-white text-sm font-semibold tracking-[0.1em] uppercase shadow-rosa disabled:opacity-60"
                        >
                          {busy && <Loader2 size={14} className="animate-spin" />}
                          Enviar cadastro
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="text-center pb-10 text-[11px] text-ink-soft tracking-wide">
        <p>© Monarê Semijoias — dados protegidos conforme a LGPD</p>
      </footer>
    </main>
  );
}
