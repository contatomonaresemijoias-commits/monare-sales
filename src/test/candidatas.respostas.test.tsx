import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Candidatas from '@/components/rh/Candidatas';

const { listRows, updateRow, invokeFunction } = vi.hoisted(() => ({
  listRows: vi.fn(),
  updateRow: vi.fn(),
  invokeFunction: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: listRows }), update: updateRow }),
    functions: { invoke: invokeFunction },
  },
}));

vi.mock('@/lib/exportarCandidatas', () => ({ exportarExcel: vi.fn(), exportarPDF: vi.fn() }));

const candidata = {
  id: 'candidata-teste',
  nome_completo: 'Candidata de teste',
  cpf: '52998224725',
  data_nascimento: '1986-05-15',
  whatsapp: '15987654321',
  email: 'candidata@example.com',
  endereco_cep: '18010000',
  endereco_rua: 'Rua de teste',
  endereco_numero: '123',
  endereco_complemento: 'Apto 1',
  endereco_bairro: 'Centro',
  endereco_cidade: 'Sorocaba',
  endereco_estado: 'SP',
  canal_principal: 'instagram',
  instagram_handle: '@candidata_teste',
  modalidade_interesse: 'mostruario',
  estado_civil: 'uniao_estavel',
  tem_filhos: 'sim',
  filhos_quantidade: 2,
  como_conheceu: 'anuncio',
  como_conheceu_outra: null,
  motivo_escolha: 'Tenho compromisso com minhas clientes.\nQuero crescer com a empresa.',
  sonho_realizacao: 'Concluir meus estudos com a renda das vendas.',
  trabalha_atualmente: 'Trabalho em uma loja no centro.',
  experiencia_vendas: 'sim',
  experiencia_vendas_detalhe: 'Vendo roupas há cinco anos.',
  restricao_cpf: 'Não tenho restrições.',
  lgpd_consent: true,
  status: 'pendente',
  avaliacao_manual: null,
  motivo_recusa: null,
  etapa_atual: 5,
  user_id: null,
  contratada_em: null,
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-02T12:00:00Z',
};

beforeEach(() => {
  listRows.mockReset().mockResolvedValue({ data: [candidata], error: null });
  updateRow.mockReset();
  invokeFunction.mockReset();
});
afterEach(cleanup);

async function abrirRespostas() {
  render(<Candidatas />);
  fireEvent.click(await screen.findByRole('button', { name: 'Questionário' }));
  return screen.findByRole('region', { name: 'Respostas do cadastro' });
}

function respostaDa(region: HTMLElement, pergunta: string) {
  return within(region).getByText(pergunta).nextElementSibling;
}

describe('Captação · respostas da candidata', () => {
  it('mostra só nome, telefone, CPF e endereço no resumo, com as ações externas', async () => {
    render(<Candidatas />);
    const card = within(await screen.findByRole('article', { name: 'Cadastro de Candidata de teste' }));
    expect(card.getByRole('heading', { name: candidata.nome_completo })).toBeVisible();
    expect(card.getByText('529.982.247-25')).toBeVisible();
    expect(card.getByText('Rua de teste, 123, Apto 1, Centro, Sorocaba, SP')).toBeVisible();
    expect(card.getByRole('link', { name: /Conversar.*WhatsApp/ })).toHaveTextContent('(15) 98765-4321');
    expect(card.queryByText(candidata.email)).not.toBeInTheDocument();
    expect(card.queryByText(candidata.instagram_handle)).not.toBeInTheDocument();
    expect(card.queryByText('Avaliação interna:')).not.toBeInTheDocument();
    expect(card.queryByRole('region', { name: 'Dados pessoais' })).not.toBeInTheDocument();
    expect(card.queryByRole('region', { name: 'Respostas do cadastro' })).not.toBeInTheDocument();
    for (const name of ['Dados pessoais', 'Questionário', 'Aprovar cadastro', 'Recusar cadastro']) {
      expect(card.getByRole('button', { name })).toBeVisible();
    }
  });

  it.each([
    ['15987654321', '5515987654321'],
    ['+55 (15) 98765-4321', '5515987654321'],
    ['55987654321', '5555987654321'],
    ['+55 (55) 98765-4321', '5555987654321'],
    ['(15) 3234-5678', '551532345678'],
  ])('abre conversa para o telefone %s sem enviar mensagem automática', async (whatsapp, expectedNumber) => {
    listRows.mockResolvedValue({ data: [{ ...candidata, whatsapp }], error: null });
    render(<Candidatas />);
    const link = await screen.findByRole('link', { name: /Conversar.*WhatsApp/ });
    expect(link).toHaveAttribute('href', `https://wa.me/${expectedNumber}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(updateRow).not.toHaveBeenCalled();
    expect(invokeFunction).not.toHaveBeenCalled();
  });

  it.each([null, '', '123', '00000000000'])('não cria link de WhatsApp para telefone ausente ou inválido: %s', async (whatsapp) => {
    listRows.mockResolvedValue({ data: [{ ...candidata, whatsapp }], error: null });
    render(<Candidatas />);
    await screen.findByRole('article', { name: 'Cadastro de Candidata de teste' });
    expect(screen.queryByRole('link', { name: /Conversar.*WhatsApp/ })).not.toBeInTheDocument();
  });

  it('permite aprovar ou abrir a recusa sem expandir nenhum painel', async () => {
    updateRow.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    render(<Candidatas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar cadastro' }));
    expect(screen.getByText('Motivo da recusa')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirmar recusa' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Questionário' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar cadastro' }));
    expect(updateRow).toHaveBeenCalledWith({ status: 'aprovada' });
    await screen.findByRole('button', { name: 'Dados pessoais' });
  });

  it('mantém Contratar acessível por fora para candidatas aprovadas', async () => {
    listRows.mockResolvedValue({ data: [{ ...candidata, status: 'aprovada' }], error: null });
    render(<Candidatas />);
    fireEvent.click(await screen.findByRole('button', { name: /Aprovadas/ }));
    expect(screen.getByRole('button', { name: 'Contratar' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Contratar' }));
    expect(screen.getByText('Criar acesso ao sistema')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirmar contratação' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dados pessoais' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Questionário' })).toHaveAttribute('aria-expanded', 'false');
    expect(invokeFunction).not.toHaveBeenCalled();
  });

  it('mostra as perguntas de avaliação e perfil no botão Questionário', async () => {
    const region = await abrirRespostas();
    expect(respostaDa(region, 'Por que devemos escolher o seu cadastro?')?.textContent).toBe(candidata.motivo_escolha);
    expect(respostaDa(region, 'Qual sonho ou realização você quer conquistar com as vendas?')).toHaveTextContent(candidata.sonho_realizacao);
    expect(respostaDa(region, 'Você trabalha atualmente? Se sim, onde e com o quê?')).toHaveTextContent(candidata.trabalha_atualmente);
    expect(respostaDa(region, 'Você possui experiência com vendas?')).toHaveTextContent('Sim');
    expect(respostaDa(region, 'O que você vende ou já vendeu?')).toHaveTextContent(candidata.experiencia_vendas_detalhe);
    expect(respostaDa(region, 'Você possui restrição no CPF? Se sim, onde?')).toHaveTextContent(candidata.restricao_cpf);
    expect(respostaDa(region, 'Como você conheceu a marca?')).toHaveTextContent('Anúncio');
    expect(respostaDa(region, 'Qual modalidade de parceria você tem interesse?')).toHaveTextContent('Mostruário');
    expect(respostaDa(region, 'Qual é o seu principal canal de vendas?')).toHaveTextContent('Instagram');
    expect(respostaDa(region, 'Qual é o seu @ do Instagram?')).toHaveTextContent('@candidata_teste');
    expect(screen.getByRole('button', { name: 'Dados pessoais' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Questionário' })).toHaveAttribute('aria-expanded', 'true');
    expect(updateRow).not.toHaveBeenCalled();
    expect(invokeFunction).not.toHaveBeenCalled();
  });

  it('alterna entre dados pessoais e questionário, permitindo fechar os dois', async () => {
    await abrirRespostas();
    fireEvent.click(screen.getByRole('button', { name: 'Dados pessoais' }));
    const dados = within(screen.getByRole('region', { name: 'Dados pessoais' }));
    expect(dados.getByText('União estável')).toBeVisible();
    expect(dados.getByText('Sim, 2 filhos')).toBeVisible();
    expect(dados.getByText('Autorizado')).toBeVisible();
    expect(dados.getByText(candidata.email)).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Respostas do cadastro' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Questionário' })).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Dados pessoais' }));
    expect(screen.queryByRole('region', { name: 'Dados pessoais' })).not.toBeInTheDocument();
    expect(screen.getByText('529.982.247-25')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Questionário' }));
    expect(respostaDa(screen.getByRole('region', { name: 'Respostas do cadastro' }), 'Por que devemos escolher o seu cadastro?')?.textContent).toBe(candidata.motivo_escolha);
    fireEvent.click(screen.getByRole('button', { name: 'Questionário' }));
    expect(screen.queryByRole('region', { name: 'Respostas do cadastro' })).not.toBeInTheDocument();
  });

  it('exibe as respostas já salvas em cadastros incompletos e sinaliza as ausentes', async () => {
    listRows.mockResolvedValue({ data: [{ ...candidata, status: 'CADASTRO_NAO_CONCLUIDO', motivo_escolha: null, sonho_realizacao: null, restricao_cpf: null, lgpd_consent: false }], error: null });
    render(<Candidatas />);
    fireEvent.click(await screen.findByRole('button', { name: /Cadastro Não Concluído/ }));
    expect(screen.queryByRole('region', { name: 'Respostas do cadastro' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conversar.*WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/5515987654321');
    fireEvent.click(screen.getByRole('button', { name: 'Questionário' }));
    const region = screen.getByRole('region', { name: 'Respostas do cadastro' });
    expect(respostaDa(region, 'Você trabalha atualmente? Se sim, onde e com o quê?')).toHaveTextContent(candidata.trabalha_atualmente);
    expect(respostaDa(region, 'Como você conheceu a marca?')).toHaveTextContent('Anúncio');
    expect(respostaDa(region, 'Por que devemos escolher o seu cadastro?')).toHaveTextContent('Resposta ainda não salva');
    expect(within(region).getByText(/As respostas finais só são salvas ao enviar o cadastro/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Aprovar cadastro' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dados pessoais' }));
    expect(screen.getByText('Autorização não registrada')).toBeVisible();
  });

  it('identifica respostas ausentes em cadastros antigos sem inventar respostas', async () => {
    listRows.mockResolvedValue({ data: [{ ...candidata, motivo_escolha: '   ', sonho_realizacao: null, experiencia_vendas: null }], error: null });
    const region = await abrirRespostas();
    expect(respostaDa(region, 'Por que devemos escolher o seu cadastro?')).toHaveTextContent('Resposta não registrada');
    expect(respostaDa(region, 'Qual sonho ou realização você quer conquistar com as vendas?')).toHaveTextContent('Resposta não registrada');
    expect(respostaDa(region, 'Você possui experiência com vendas?')).toHaveTextContent('Resposta não registrada');
  });

  it('mostra o detalhe de Outra e respeita a resposta Não sobre experiência', async () => {
    listRows.mockResolvedValue({ data: [{ ...candidata, como_conheceu: 'outra', como_conheceu_outra: 'Conheci em uma loja.', experiencia_vendas: 'nao' }], error: null });
    const region = await abrirRespostas();
    expect(respostaDa(region, 'Como você conheceu a marca?')).toHaveTextContent('Outra');
    expect(respostaDa(region, 'Como conheceu a marca — detalhe de Outra')).toHaveTextContent('Conheci em uma loja.');
    expect(respostaDa(region, 'Você possui experiência com vendas?')).toHaveTextContent('Não');
  });

  it.each([
    ['aprovada', 'Aprovadas'],
    ['contratada', 'Contratadas'],
    ['recusada', 'Recusadas'],
  ])('mantém o questionário acessível no status %s', async (status, aba) => {
    listRows.mockResolvedValue({ data: [{ ...candidata, status }], error: null });
    render(<Candidatas />);
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(aba) }));
    fireEvent.click(screen.getByRole('button', { name: 'Questionário' }));
    const region = screen.getByRole('region', { name: 'Respostas do cadastro' });
    expect(respostaDa(region, 'Por que devemos escolher o seu cadastro?')?.textContent).toBe(candidata.motivo_escolha);
  });

  it('preserva quebras de linha e trata respostas como texto, sem executar HTML', async () => {
    const resposta = '<script>alert("teste")</script>\n' + 'RespostaLonga'.repeat(100);
    listRows.mockResolvedValue({ data: [{ ...candidata, motivo_escolha: resposta }], error: null });
    const region = await abrirRespostas();
    const answer = respostaDa(region, 'Por que devemos escolher o seu cadastro?');
    expect(answer?.textContent).toBe(resposta);
    expect(answer).toHaveClass('whitespace-pre-wrap', '[overflow-wrap:anywhere]');
    expect(answer?.querySelector('script')).toBeNull();
  });
});
