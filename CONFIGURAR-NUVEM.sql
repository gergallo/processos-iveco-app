-- Controle Processos Iveco · banco na nuvem (Supabase)
-- Rode uma vez no SQL Editor do projeto. Pode rodar de novo sem perder dados.

-- 1) Documentos do controle (programação, follow, alertas, cidades, metadados...)
create table if not exists public.docs (
  path        text primary key,          -- ex.: "follow/MSCU1234567", "prog/MSCU1234567", "meta/info"
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- 2) Quem pode editar (importar, editar, excluir). Os demais logados só leem.
create table if not exists public.editores (
  email text primary key
);

alter table public.docs     enable row level security;
alter table public.editores enable row level security;

-- leitura: qualquer usuário logado
drop policy if exists docs_ler on public.docs;
create policy docs_ler on public.docs for select to authenticated using (true);

-- escrita: só quem está na tabela editores
drop policy if exists docs_inserir on public.docs;
create policy docs_inserir on public.docs for insert to authenticated
  with check (exists (select 1 from public.editores e where lower(e.email) = lower(auth.jwt() ->> 'email')));
drop policy if exists docs_alterar on public.docs;
create policy docs_alterar on public.docs for update to authenticated
  using      (exists (select 1 from public.editores e where lower(e.email) = lower(auth.jwt() ->> 'email')))
  with check (exists (select 1 from public.editores e where lower(e.email) = lower(auth.jwt() ->> 'email')));
drop policy if exists docs_excluir on public.docs;
create policy docs_excluir on public.docs for delete to authenticated
  using (exists (select 1 from public.editores e where lower(e.email) = lower(auth.jwt() ->> 'email')));

-- cada usuário consegue ver se o próprio e-mail é editor
drop policy if exists editores_ver_proprio on public.editores;
create policy editores_ver_proprio on public.editores for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- atualização em tempo real
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- editor principal (troque/adicione e-mails)
insert into public.editores(email) values ('gallo.engmec@gmail.com') on conflict do nothing;
