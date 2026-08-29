import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ALLOWED_ORIGINS: Set<string> = new Set(
  (Deno.env.get('APP_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LEN = 6;

// Papéis do time de gestão. São "protegidos" no sentido de alvo: quem é RH
// não age sobre eles, para que duas pessoas de RH não possam se desativar,
// renomear ou excluir mutuamente.
const PAPEIS_PROTEGIDOS = ['administrador', 'rh'];

// Papéis que cada perfil de chamador tem permissão de criar.
const CRIAVEIS_POR_ADMIN = ['revendedora', 'b2b', 'rh'];
const CRIAVEIS_POR_RH    = ['revendedora', 'b2b'];

// Contratação sempre gera alguém do time de vendas — nunca alguém da gestão.
const PAPEIS_CONTRATACAO = ['revendedora', 'b2b'];

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON          = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: 'Não autenticado' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    /** Papéis de um usuário qualquer, lidos com service_role (ignora RLS). */
    async function papeisDe(userId: string): Promise<Set<string>> {
      const { data } = await admin.from('user_roles').select('role').eq('user_id', userId);
      return new Set((data ?? []).map((r: { role: string }) => r.role));
    }

    const papeisChamador = await papeisDe(user.id);
    const isAdmin = papeisChamador.has('administrador');
    const isRh    = papeisChamador.has('rh');

    if (!isAdmin && !isRh) {
      return json({ error: 'Acesso negado: apenas administração ou RH' }, 403);
    }

    // Ter o papel não basta: conta desativada não gerencia ninguém. Sem esta
    // checagem, desativar uma RH tiraria o painel dela mas não a API.
    const { data: perfilChamador } = await admin
      .from('profiles')
      .select('ativo')
      .eq('user_id', user.id)
      .maybeSingle();
    if (perfilChamador && (perfilChamador as { ativo: boolean }).ativo === false) {
      return json({ error: 'Conta desativada' }, 403);
    }

    /**
     * Regra única de "posso agir sobre esta conta?", usada por toda ação que
     * recebe um user_id. Devolve a mensagem de erro ou null quando liberado.
     */
    async function bloqueioNoAlvo(userId: string): Promise<string | null> {
      if (userId === user.id) return 'Você não pode executar esta ação na própria conta';
      const alvo = await papeisDe(userId);
      if (alvo.has('administrador')) {
        return 'Não é possível alterar a conta de um administrador por esta rota';
      }
      if (isRh && alvo.has('rh')) {
        return 'RH não pode alterar a conta de outro usuário de RH';
      }
      return null;
    }

    /**
     * Criação de conta, compartilhada por `create` e `hire`.
     *
     * O trigger on_auth_user_created já insere o profile com display_name;
     * o upsert aqui existe para gravar o telefone, que o trigger não conhece.
     */
    async function criarUsuario(args: {
      email: string;
      password: string;
      safeName: string;
      role: string;
      telefone?: unknown;
    }): Promise<string> {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: args.email,
        password: args.password,
        email_confirm: true,
        user_metadata: { display_name: args.safeName },
      });
      if (cErr || !created.user) throw cErr ?? new Error('Falha ao criar usuário');

      const novoId = created.user.id;
      const tel = typeof args.telefone === 'string' && args.telefone.trim()
        ? args.telefone.trim().slice(0, 30)
        : null;

      await admin.from('profiles').upsert(
        { user_id: novoId, display_name: args.safeName, telefone: tel },
        { onConflict: 'user_id' },
      );
      await admin.from('user_roles').insert({ user_id: novoId, role: args.role });

      return novoId;
    }

    const body = await req.json();
    const { action } = body;

    // ---------------------------------------------------------------
    // ACTION: create
    // ---------------------------------------------------------------
    if (action === 'create') {
      const { email, password, display_name, role, telefone } = body;

      if (!email || !password) return json({ error: 'E-mail e senha obrigatórios' }, 400);
      if (!EMAIL_RE.test(email) || email.length > 254) {
        return json({ error: 'Formato de e-mail inválido' }, 400);
      }
      if (password.length < MIN_PASSWORD_LEN) {
        return json({ error: `Senha deve ter ao menos ${MIN_PASSWORD_LEN} caracteres` }, 400);
      }

      const safeName = typeof display_name === 'string' ? display_name.trim().slice(0, 100) : '';
      if (safeName.length < 2) return json({ error: 'Nome deve ter ao menos 2 caracteres' }, 400);

      // Antes o papel desconhecido virava 'revendedora' em silêncio. Agora
      // recusa: um papel errado em criação de conta é erro de chamada, não
      // algo para adivinhar.
      const permitidos = isAdmin ? CRIAVEIS_POR_ADMIN : CRIAVEIS_POR_RH;
      if (!permitidos.includes(role)) {
        return json(
          {
            error: isAdmin
              ? 'Papel inválido. Use revendedora, b2b ou rh.'
              : 'RH só pode criar contas de revendedora ou B2B.',
          },
          isAdmin ? 400 : 403,
        );
      }

      const novoId = await criarUsuario({ email, password, safeName, role, telefone });
      return json({ ok: true, user_id: novoId });
    }

    // ---------------------------------------------------------------
    // ACTION: hire — candidata aprovada vira usuária do sistema
    // ---------------------------------------------------------------
    // É a "contratação" propriamente dita: até aqui a candidata só existia
    // em candidatas_revenda, sem login. Aqui ela ganha conta, papel e o
    // vínculo de volta na ficha, para a captação saber quem já entrou.
    if (action === 'hire') {
      const { candidata_id, email, password, role, display_name } = body;

      if (!candidata_id || typeof candidata_id !== 'string') {
        return json({ error: 'candidata_id obrigatório' }, 400);
      }
      if (!PAPEIS_CONTRATACAO.includes(role)) {
        return json({ error: 'Contratação só cria revendedora ou B2B.' }, 400);
      }
      if (!email || !EMAIL_RE.test(email) || email.length > 254) {
        return json({ error: 'Formato de e-mail inválido' }, 400);
      }
      if (!password || password.length < MIN_PASSWORD_LEN) {
        return json({ error: `Senha deve ter ao menos ${MIN_PASSWORD_LEN} caracteres` }, 400);
      }

      const { data: candidata } = await admin
        .from('candidatas_revenda')
        .select('id, nome_completo, whatsapp, status, user_id')
        .eq('id', candidata_id)
        .maybeSingle();

      if (!candidata) return json({ error: 'Candidata não encontrada' }, 404);
      if (candidata.user_id) return json({ error: 'Esta candidata já foi contratada' }, 409);
      if (candidata.status !== 'aprovada') {
        return json({ error: 'Só é possível contratar uma candidata aprovada' }, 409);
      }

      const nome = typeof display_name === 'string' && display_name.trim().length >= 2
        ? display_name.trim().slice(0, 100)
        : (candidata.nome_completo ?? '').trim().slice(0, 100);
      if (nome.length < 2) return json({ error: 'Nome deve ter ao menos 2 caracteres' }, 400);

      const novoId = await criarUsuario({
        email,
        password,
        safeName: nome,
        role,
        telefone: candidata.whatsapp,
      });

      const { error: vErr } = await admin
        .from('candidatas_revenda')
        .update({ status: 'contratada', user_id: novoId, contratada_em: new Date().toISOString() })
        .eq('id', candidata_id);

      if (vErr) {
        // A conta existe mas a ficha não aponta para ela: sem o vínculo, a
        // próxima contratação criaria um segundo login para a mesma pessoa.
        // Desfaz a criação em vez de deixar o par inconsistente.
        await admin.auth.admin.deleteUser(novoId);
        console.error('[admin-manage-users] hire: falha ao vincular candidata', vErr);
        return json({ error: 'Não foi possível concluir a contratação. Tente novamente.' }, 500);
      }

      return json({ ok: true, user_id: novoId });
    }

    // ---------------------------------------------------------------
    // ACTION: delete
    // ---------------------------------------------------------------
    // RH exclui revendedora e B2B — desligar alguém é trabalho de RH, e
    // deixar só o admin apagar criava fila para uma tarefa corriqueira.
    // Quem NÃO pode ser excluído continua valendo por `bloqueioNoAlvo`:
    // ninguém apaga a si mesmo, ninguém apaga um administrador e RH não
    // apaga RH. A cascata (vendas, ciclos, estoque) é avisada na tela.
    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id || typeof user_id !== 'string') return json({ error: 'user_id obrigatório' }, 400);

      const bloqueio = await bloqueioNoAlvo(user_id);
      if (bloqueio) return json({ error: bloqueio }, 403);

      const { error: dErr } = await admin.auth.admin.deleteUser(user_id);
      if (dErr) throw dErr;
      return json({ ok: true });
    }

    // ---------------------------------------------------------------
    // ACTION: list
    // ---------------------------------------------------------------
    if (action === 'list') {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, user_id, display_name, telefone, ativo, created_at')
        .order('created_at', { ascending: false });

      const { data: rolesAll } = await admin.from('user_roles').select('user_id, role');
      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });

      const emailMap = new Map(usersList.users.map((u) => [u.id, u.email]));
      const rolesMap = new Map<string, string[]>();
      (rolesAll ?? []).forEach((r) => {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });

      const result = (profiles ?? [])
        .map((p) => ({
          id: p.id,
          user_id: p.user_id,
          display_name: p.display_name,
          telefone: (p as { telefone: string | null }).telefone ?? null,
          ativo: (p as { ativo?: boolean }).ativo ?? true,
          created_at: p.created_at,
          email: emailMap.get(p.user_id) ?? null,
          roles: rolesMap.get(p.user_id) ?? [],
        }))
        // Para o RH, a gestão nem aparece na lista. Não é só estética: o que
        // não é listado não é clicado por engano, e o bloqueio por alvo vira
        // a segunda barreira em vez da única.
        .filter((u) => isAdmin || !u.roles.some((r) => PAPEIS_PROTEGIDOS.includes(r)));

      return json({ users: result });
    }

    // ---------------------------------------------------------------
    // ACTION: reset_password
    // ---------------------------------------------------------------
    if (action === 'reset_password') {
      const { user_id, new_password } = body;
      if (!user_id || typeof user_id !== 'string') return json({ error: 'user_id obrigatório' }, 400);
      if (!new_password || typeof new_password !== 'string' || new_password.length < MIN_PASSWORD_LEN) {
        return json({ error: `Nova senha deve ter ao menos ${MIN_PASSWORD_LEN} caracteres` }, 400);
      }

      const bloqueio = await bloqueioNoAlvo(user_id);
      if (bloqueio) return json({ error: bloqueio }, 403);

      const { error: pErr } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
      if (pErr) throw pErr;

      return json({ ok: true });
    }

    // ---------------------------------------------------------------
    // ACTION: update_email
    // ---------------------------------------------------------------
    // O e-mail é a credencial de login e mora em auth.users, fora do
    // alcance do PostgREST — nome e telefone a tela salva direto em
    // `profiles`, mas trocar e-mail exige a Admin API. Daí a action.
    if (action === 'update_email') {
      const { user_id, email } = body;
      if (!user_id || typeof user_id !== 'string') return json({ error: 'user_id obrigatório' }, 400);
      if (!email || typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 254) {
        return json({ error: 'Formato de e-mail inválido' }, 400);
      }

      const bloqueio = await bloqueioNoAlvo(user_id);
      if (bloqueio) return json({ error: bloqueio }, 403);

      const alvoEmail = email.trim().toLowerCase();

      // Confere ANTES de tentar. E-mail repetido bate na unique constraint do
      // GoTrue, que responde 500 com o erro cru do Postgres ("duplicate key
      // ... users_email_partial_key") — e o cliente não repassa essa mensagem
      // de forma confiável. Perguntar primeiro transforma o 500 num 409 com
      // texto que a pessoa entende, sem depender de casar string de erro.
      const busca = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(alvoEmail)}`,
        { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
      );
      if (busca.ok) {
        // `filter` casa por trecho, então a comparação exata é obrigatória:
        // "ana@x.com" traria também "mariana@x.com".
        const { users: achados = [] } = await busca.json();
        const conflito = achados.find(
          (u: { id: string; email?: string }) =>
            (u.email ?? '').toLowerCase() === alvoEmail && u.id !== user_id,
        );
        if (conflito) return json({ error: 'Este e-mail já está em uso por outra conta' }, 409);
      }

      // `email_confirm: true` porque a troca é feita pela gestão, não pela
      // própria pessoa: sem isso a conta ficaria aguardando uma confirmação
      // que ninguém vai clicar, e o login pararia.
      const { error: eErr } = await admin.auth.admin.updateUserById(user_id, {
        email: alvoEmail,
        email_confirm: true,
      });
      if (eErr) {
        // Rede de segurança para a corrida entre a checagem e a escrita.
        const jaExiste = /already|duplicate|registered|23505|unique/i.test(eErr.message ?? '');
        if (jaExiste) return json({ error: 'Este e-mail já está em uso por outra conta' }, 409);
        throw eErr;
      }

      return json({ ok: true });
    }

    // ---------------------------------------------------------------
    // ACTION: toggle_active
    // ---------------------------------------------------------------
    if (action === 'toggle_active') {
      const { user_id, ativo } = body;
      if (!user_id || typeof user_id !== 'string') return json({ error: 'user_id obrigatório' }, 400);
      if (typeof ativo !== 'boolean') return json({ error: 'ativo (boolean) obrigatório' }, 400);

      const bloqueio = await bloqueioNoAlvo(user_id);
      if (bloqueio) return json({ error: bloqueio }, 403);

      const { error: tErr } = await admin
        .from('profiles')
        .update({ ativo } as Record<string, unknown>)
        .eq('user_id', user_id);
      if (tErr) throw tErr;

      // Só marcar o profile não impedia login: o RLS agora bloqueia os dados,
      // mas a conta ainda autenticava. Banir no GoTrue derruba o refresh token
      // e barra novos logins; o access token atual (≤1h) já não enxerga nada.
      const { error: bErr } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: ativo ? 'none' : '876000h', // 'none' = reativa; ~100 anos = banida
      });
      if (bErr) {
        // Profile já foi atualizado — avisa em vez de fingir sucesso total.
        console.error('[admin-manage-users] ban/unban falhou', bErr);
        return json(
          {
            ok: false,
            error: ativo
              ? 'Perfil reativado, mas o login continua bloqueado. Tente novamente.'
              : 'Perfil desativado, mas a sessão de login não foi revogada. Tente novamente.',
          },
          500,
        );
      }

      return json({ ok: true });
    }

    return json({ error: 'Ação inválida' }, 400);

  } catch (e: unknown) {
    console.error('[admin-manage-users]', e);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' },
    });
  }
});
