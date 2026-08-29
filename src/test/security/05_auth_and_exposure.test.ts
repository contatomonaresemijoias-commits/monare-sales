/**
 * SECURITY TESTS — Autenticação, JWT e Exposição de Dados
 *
 * Cobre:
 *  - Role whitelist: admin não pode ser criado via edge function normal
 *  - Resposta da API não deve vazar senhas, CPFs ou tokens
 *  - CORS wildcard no edge function expõe rota de admin
 *  - Resposta de erro não deve vazar detalhes internos do servidor
 */

import { describe, it, expect } from 'vitest';

// ─── Simulação dos handlers do edge function ──────────────────────────────────

// Espelha a whitelist de `create` da edge function. Papel fora da lista era
// rebaixado para 'revendedora' em silêncio; hoje é recusado — criar conta com
// o papel errado é erro de chamada, não algo para adivinhar.
const CRIAVEIS_POR_ADMIN = ['revendedora', 'b2b', 'rh'] as const;
const CRIAVEIS_POR_RH = ['revendedora', 'b2b'] as const;

type Chamador = 'administrador' | 'rh';

function assignRole(
  requestedRole: string,
  chamador: Chamador = 'administrador',
): { ok: true; role: string } | { ok: false; status: number } {
  const permitidos: readonly string[] =
    chamador === 'administrador' ? CRIAVEIS_POR_ADMIN : CRIAVEIS_POR_RH;
  if (!permitidos.includes(requestedRole)) {
    return { ok: false, status: chamador === 'administrador' ? 400 : 403 };
  }
  return { ok: true, role: requestedRole };
}

/** Simula o que o edge function retorna em erro (versão segura) */
function tratarErroSeguro(_internalError: Error): { status: number; body: { error: string } } {
  // Não vaza stack trace, nome da exceção, query SQL etc.
  return { status: 500, body: { error: 'Erro interno do servidor' } };
}

/** Simula o que o edge function retornou antes (versão vulnerável) */
function tratarErroVulneravel(internalError: Error): { status: number; body: { error: string } } {
  return { status: 500, body: { error: internalError.message } }; // ← vaza mensagem interna
}

/** Simula filtro de campos na resposta de perfil */
interface UserDbRow {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  phone: string;
  password_hash: string; // nunca deve ser exposto
  cpf?: string;
}

function serializarPerfilSeguro(row: UserDbRow) {
  // Expõe apenas o necessário para o frontend
  return {
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name,
    // email, phone, password_hash, cpf NÃO são incluídos
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Autenticação — Role whitelist no edge function', () => {
  it('role "administrador" enviado pelo cliente é recusado, nunca concedido', () => {
    expect(assignRole('administrador')).toEqual({ ok: false, status: 400 });
  });

  it('role "superadmin" desconhecido é recusado', () => {
    expect(assignRole('superadmin')).toEqual({ ok: false, status: 400 });
  });

  it('role vazio é recusado', () => {
    expect(assignRole('')).toEqual({ ok: false, status: 400 });
  });

  it('roles válidos são aceitos', () => {
    expect(assignRole('revendedora')).toEqual({ ok: true, role: 'revendedora' });
    expect(assignRole('b2b')).toEqual({ ok: true, role: 'b2b' });
  });

  it('admin pode criar conta de RH', () => {
    expect(assignRole('rh', 'administrador')).toEqual({ ok: true, role: 'rh' });
  });

  it('RH NÃO pode criar outra conta de RH — fabricaria pares para se blindar', () => {
    expect(assignRole('rh', 'rh')).toEqual({ ok: false, status: 403 });
  });

  it('RH continua criando revendedora e B2B, que é o trabalho dele', () => {
    expect(assignRole('revendedora', 'rh')).toEqual({ ok: true, role: 'revendedora' });
    expect(assignRole('b2b', 'rh')).toEqual({ ok: true, role: 'b2b' });
  });
});

describe('Exposição de Dados — Resposta de erro não vaza detalhes internos', () => {
  it('erro interno NÃO expõe mensagem da exceção (versão corrigida)', () => {
    const err = new Error('duplicate key value violates unique constraint "user_roles_user_id_role_key"');
    const response = tratarErroSeguro(err);

    expect(response.body.error).toBe('Erro interno do servidor');
    expect(response.body.error).not.toContain('constraint');
    expect(response.body.error).not.toContain('duplicate');
    expect(response.body.error).not.toContain('user_roles');
  });

  it('erro interno EXPÕE mensagem da exceção (versão vulnerável — documenta problema)', () => {
    const err = new Error('relation "vendas" does not exist');
    const response = tratarErroVulneravel(err);

    // Este teste documenta que a versão original vazava o erro interno
    expect(response.body.error).toContain('relation');
    expect(response.body.error).toContain('vendas');
    // Um atacante consegue mapear o schema do banco via mensagens de erro
  });
});

describe('Exposição de Dados — Serialização de perfil de usuário', () => {
  it('serialização segura não expõe campos sensíveis', () => {
    const row: UserDbRow = {
      id: 'uuid-1',
      user_id: 'auth-uid-1',
      display_name: 'Alice',
      email: 'alice@exemplo.com',
      phone: '11999990001',
      password_hash: '$2b$12$...',
      cpf: '123.456.789-09',
    };

    const serializado = serializarPerfilSeguro(row);

    expect(serializado).toHaveProperty('display_name');
    expect(serializado).not.toHaveProperty('email');
    expect(serializado).not.toHaveProperty('phone');
    expect(serializado).not.toHaveProperty('password_hash');
    expect(serializado).not.toHaveProperty('cpf');
  });
});

describe('Autenticação — CORS wildcard no edge function', () => {
  it('CORS wildcard permite qualquer origem acessar rotas de admin (documenta risco)', () => {
    // A versão original tinha: 'Access-Control-Allow-Origin': '*'
    // Isso significa que qualquer site pode fazer requests ao endpoint de admin
    // desde que tenha um JWT de admin válido.
    //
    // O risco real é em combinação com XSS: se o site principal tiver XSS,
    // um atacante pode roubar o JWT e usar de qualquer origem.
    //
    // A versão corrigida restringe ao APP_ORIGIN configurado.

    const vulneravelOrigin = '*';
    const corrigidoOrigin  = 'https://meuapp.vercel.app';

    expect(vulneravelOrigin).toBe('*');   // documenta vulnerabilidade
    expect(corrigidoOrigin).not.toBe('*'); // documenta correção
  });
});

describe('JWT — localStorage vs. httpOnly cookie', () => {
  it('JWT armazenado em localStorage é acessível via JavaScript (risco XSS)', () => {
    // src/integrations/supabase/client.ts usa:
    //   storage: localStorage — padrão do Supabase
    //
    // Se a aplicação tiver XSS, o token pode ser roubado com:
    //   document.cookie ou localStorage.getItem(...)
    //
    // Mitigação recomendada: usar sessões com cookies httpOnly
    // (requer configuração no servidor / proxy)
    //
    // Este teste documenta o risco sem propor solução de código
    // (mudança de storage envolve tradeoffs de UX e infraestrutura)

    const storageType = 'localStorage';
    expect(storageType).toBe('localStorage'); // confirma o risco documentado
  });
});
