-- Tabela de clientes únicos identificados pelo WhatsApp (dígitos apenas)
create table if not exists public.clientes (
  id          uuid        primary key default gen_random_uuid(),
  nome        text        not null,
  whatsapp    text        not null,   -- apenas dígitos, ex: "11999999999"
  parceira_id uuid        references public.parceiras(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists clientes_whatsapp_unique on public.clientes (whatsapp);

-- updated_at automático
create trigger set_clientes_updated_at
  before update on public.clientes
  for each row execute function update_updated_at_column();

-- RLS
alter table public.clientes enable row level security;

-- Admin: acesso total
create policy "clientes_admin_all" on public.clientes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Autenticado: leitura
create policy "clientes_auth_select" on public.clientes
  for select
  to authenticated
  using (true);

-- Autenticado: inserção (cadastro no momento da venda)
create policy "clientes_auth_insert" on public.clientes
  for insert
  to authenticated
  with check (true);

-- Autenticado: atualização (atualiza parceira/nome na próxima venda)
create policy "clientes_auth_update" on public.clientes
  for update
  to authenticated
  using (true)
  with check (true);
