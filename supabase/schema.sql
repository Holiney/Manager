-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
create table if not exists public.app_docs (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text        not null check (kind in ('core', 'job')),
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

alter table public.app_docs enable row level security;

-- every user sees and changes only their own rows
create policy "own rows select" on public.app_docs for select using (auth.uid() = user_id);
create policy "own rows insert" on public.app_docs for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.app_docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.app_docs for delete using (auth.uid() = user_id);

-- ---- Photos (run this part too; safe to run again) ----
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', false)
on conflict (id) do nothing;

drop policy if exists "photos select own" on storage.objects;
drop policy if exists "photos insert own" on storage.objects;
drop policy if exists "photos update own" on storage.objects;
drop policy if exists "photos delete own" on storage.objects;

create policy "photos select own" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
