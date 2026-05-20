-- Tabela de categorias de produtos
create table if not exists public.categorias (
  id         uuid        primary key default gen_random_uuid(),
  nome       text        not null,
  prefixo    text        not null,   -- Prefixo do SKU, ex: "ANL", "COL", "PUL"
  created_at timestamptz not null default now()
);

create unique index if not exists categorias_prefixo_unique on public.categorias (upper(prefixo));
create unique index if not exists categorias_nome_unique    on public.categorias (lower(nome));

-- RLS
alter table public.categorias enable row level security;

-- Leitura pública (necessário para SkuCombobox e formulários de venda)
create policy "categorias_public_select" on public.categorias
  for select using (true);

-- Admin: escrita total
create policy "categorias_admin_all" on public.categorias
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

-- Adiciona categoria_id à tabela de produtos
alter table public.produtos
  add column if not exists categoria_id uuid references public.categorias(id) on delete set null;

create index if not exists idx_produtos_categoria_id on public.produtos (categoria_id);
