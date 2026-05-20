import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Restringe CORS ao domínio da aplicação. Em produção, substitua pela URL real.
const ALLOWED_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://tybuxoxugidepqyxjfem.supabase.co';

function corsHeaders(origin: string | null) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LEN = 10;
// Pelo menos: 1 maiúscula, 1 minúscula, 1 dígito, 1 caractere especial
const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':",.<>?/\\|`~])/;

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON          = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    // --- Autenticação ---
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // --- Autorização: apenas administrador ---
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'administrador')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Acesso negado: apenas admin' }), {
        status: 403, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ---------------------------------------------------------------
    // ACTION: create
    // ---------------------------------------------------------------
    if (action === 'create') {
      const { email, password, display_name, role } = body;

      // Validação de campos obrigatórios
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'E-mail e senha obrigatórios' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Validação de formato de e-mail (server-side)
      if (!EMAIL_RE.test(email) || email.length > 254) {
        return new Response(JSON.stringify({ error: 'Formato de e-mail inválido' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Validação de força de senha
      if (password.length < MIN_PASSWORD_LEN) {
        return new Response(JSON.stringify({ error: `Senha deve ter ao menos ${MIN_PASSWORD_LEN} caracteres` }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
      if (!PASSWORD_COMPLEXITY_RE.test(password)) {
        return new Response(JSON.stringify({ error: 'Senha deve conter maiúscula, minúscula, número e caractere especial' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Sanitização de display_name
      const safeName = typeof display_name === 'string'
        ? display_name.trim().slice(0, 100)
        : '';
      if (safeName.length < 2) {
        return new Response(JSON.stringify({ error: 'Nome deve ter ao menos 2 caracteres' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Whitelist de roles: admin NÃO pode se atribuir via esta rota
      const allowedRoles = ['revendedora', 'b2b'] as const;
      const assignedRole = allowedRoles.includes(role) ? role : 'revendedora';

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: safeName },
      });
      if (cErr || !created.user) throw cErr ?? new Error('Falha ao criar usuário');

      const newId = created.user.id;
      await admin.from('profiles').upsert(
        { user_id: newId, display_name: safeName },
        { onConflict: 'user_id' },
      );
      await admin.from('user_roles').insert({ user_id: newId, role: assignedRole });

      return new Response(JSON.stringify({ ok: true, user_id: newId }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------------------------------------------
    // ACTION: delete
    // ---------------------------------------------------------------
    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id || typeof user_id !== 'string') {
        return new Response(JSON.stringify({ error: 'user_id obrigatório' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
      if (user_id === user.id) {
        return new Response(JSON.stringify({ error: 'Você não pode remover sua própria conta' }), {
          status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      // Impede deletar outro administrador
      const { data: targetRole } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .eq('role', 'administrador')
        .maybeSingle();

      if (targetRole) {
        return new Response(JSON.stringify({ error: 'Não é possível remover outro administrador por esta rota' }), {
          status: 403, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const { error: dErr } = await admin.auth.admin.deleteUser(user_id);
      if (dErr) throw dErr;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------------------------------------------
    // ACTION: list
    // ---------------------------------------------------------------
    if (action === 'list') {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, user_id, display_name, created_at')
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

      // Não expõe dados sensíveis desnecessários — apenas o que o admin precisa
      const result = (profiles ?? []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name,
        created_at: p.created_at,
        email: emailMap.get(p.user_id) ?? null,
        roles: rolesMap.get(p.user_id) ?? [],
      }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro interno';
    console.error('[admin-manage-users]', e);
    // Não vaza detalhes do erro interno para o cliente
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' },
    });
  }
});
