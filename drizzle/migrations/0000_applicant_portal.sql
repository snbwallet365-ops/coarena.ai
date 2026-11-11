create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  nationality text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- First account becomes admin; everyone else is an applicant.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  country text,
  visa_type text,
  description text not null default '',
  status text not null default 'new',
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.cases to authenticated;
grant all on public.cases to service_role;
alter table public.cases enable row level security;
create policy "cases read" on public.cases for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "cases insert" on public.cases for insert to authenticated with check (user_id = auth.uid());
create policy "cases update" on public.cases for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "cases delete" on public.cases for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  path text not null,
  mime text,
  size bigint,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.case_documents to authenticated;
grant all on public.case_documents to service_role;
alter table public.case_documents enable row level security;
create policy "docs read" on public.case_documents for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "docs insert" on public.case_documents for insert to authenticated with check (user_id = auth.uid());
create policy "docs delete" on public.case_documents for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  case_id uuid,
  agent text not null,
  event text not null check (event in ('start','complete','fail')),
  detail text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
grant select, insert on public.agent_events to authenticated;
grant all on public.agent_events to service_role;
alter table public.agent_events enable row level security;
create policy "events read" on public.agent_events for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "events insert" on public.agent_events for insert to authenticated with check (user_id = auth.uid());
create index on public.agent_events (created_at);

create policy "case files read" on storage.objects for select to authenticated using (bucket_id = 'case-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin')));
create policy "case files insert" on storage.objects for insert to authenticated with check (bucket_id = 'case-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "case files delete" on storage.objects for delete to authenticated using (bucket_id = 'case-docs' and (storage.foldername(name))[1] = auth.uid()::text);