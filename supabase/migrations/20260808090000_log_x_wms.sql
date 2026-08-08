-- LOG-X WMS: data-driven permissions, field audit and translations.
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.access_level as enum ('deny', 'read', 'write');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.table_permissions (
  role public.app_role not null,
  table_name text not null,
  access public.access_level not null default 'deny',
  primary key (role, table_name)
);
create table public.field_permissions (
  role public.app_role not null,
  table_name text not null,
  field_name text not null,
  access public.access_level not null default 'deny',
  primary key (role, table_name, field_name)
);
create table public.test_entities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  owner text not null,
  status text not null check (status in ('draft','active')) default 'draft',
  risk text not null check (risk in ('low','medium','high')) default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  table_name text not null,
  record_id uuid,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  occurred_at timestamptz not null default now()
);
create table public.languages (
  code text primary key check (code ~ '^[a-z]{2,8}$'),
  name text not null,
  enabled boolean not null default true
);
create table public.translation_keys (key text primary key);
create table public.translation_values (
  language_code text not null references public.languages(code) on delete cascade,
  key text not null references public.translation_keys(key) on delete cascade,
  value text not null,
  primary key (language_code, key)
);

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active limit 1
$$;
create or replace function public.has_table_access(target text, required public.access_level)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.table_permissions
    where role = public.current_role() and table_name = target
      and (access = 'write' or (required = 'read' and access = 'read'))
  )
$$;
create or replace function public.has_field_access(target_table text, target_field text, required public.access_level)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.field_permissions
    where role = public.current_role() and table_name = target_table and field_name = target_field
      and (access = 'write' or (required = 'read' and access = 'read'))
  )
$$;

-- RPC reads prevent a denied column leaking through a broad SELECT grant.
create or replace function public.read_test_entities()
returns setof jsonb language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', id,
    'code', case when public.has_field_access('test_entities','code','read') then code end,
    'name', case when public.has_field_access('test_entities','name','read') then name end,
    'owner', case when public.has_field_access('test_entities','owner','read') then owner end,
    'status', case when public.has_field_access('test_entities','status','read') then status end,
    'risk', case when public.has_field_access('test_entities','risk','read') then risk end,
    'updatedAt', updated_at
  )) from public.test_entities where public.has_table_access('test_entities','read')
$$;
create or replace function public.write_test_entity(target_id uuid, payload jsonb)
returns public.test_entities language plpgsql security definer set search_path = public as $$
declare old_row public.test_entities; new_row public.test_entities; f text;
begin
  if not public.has_table_access('test_entities','write') then raise exception 'table access denied'; end if;
  foreach f in array array['code','name','owner','status','risk'] loop
    if payload ? f and not public.has_field_access('test_entities',f,'write') then raise exception 'field access denied: %', f; end if;
  end loop;
  if target_id is null then
    insert into public.test_entities(code,name,owner,status,risk) values (payload->>'code',payload->>'name',payload->>'owner',coalesce(payload->>'status','draft'),coalesce(payload->>'risk','medium')) returning * into new_row;
  else
    select * into old_row from public.test_entities where id=target_id for update;
    if not found then raise exception 'not found'; end if;
    update public.test_entities set
      code=case when payload ? 'code' then payload->>'code' else old_row.code end,
      name=case when payload ? 'name' then payload->>'name' else old_row.name end,
      owner=case when payload ? 'owner' then payload->>'owner' else old_row.owner end,
      status=case when payload ? 'status' then payload->>'status' else old_row.status end,
      risk=case when payload ? 'risk' then payload->>'risk' else old_row.risk end,
      updated_at=now() where id=target_id returning * into new_row;
  end if;
  return new_row;
end $$;
create or replace function public.audit_test_entity()
returns trigger language plpgsql security definer set search_path = public as $$
declare key text; old_json jsonb := to_jsonb(old); new_json jsonb := to_jsonb(new);
begin
  if tg_op = 'DELETE' then insert into public.audit_log(actor_id,table_name,record_id,field_name,old_value,new_value) values (auth.uid(),tg_table_name,old.id,'__record__',old_json,'"deleted"'::jsonb); return old; end if;
  foreach key in array array['code','name','owner','status','risk'] loop
    if tg_op='INSERT' or old_json->key is distinct from new_json->key then
      insert into public.audit_log(actor_id,table_name,record_id,field_name,old_value,new_value) values (auth.uid(),tg_table_name,new.id,key,case when tg_op='INSERT' then null else old_json->key end,new_json->key);
    end if;
  end loop;
  return new;
end $$;
create trigger test_entities_audit after insert or update or delete on public.test_entities for each row execute function public.audit_test_entity();

alter table public.profiles enable row level security;
alter table public.table_permissions enable row level security;
alter table public.field_permissions enable row level security;
alter table public.test_entities enable row level security;
alter table public.audit_log enable row level security;
alter table public.languages enable row level security;
alter table public.translation_keys enable row level security;
alter table public.translation_values enable row level security;
create policy "own profile or admin" on public.profiles for select using (id=auth.uid() or public.current_role()='admin');
create policy "admin profile management" on public.profiles for all using (public.current_role()='admin') with check (public.current_role()='admin');
create policy "permission read" on public.table_permissions for select using (auth.uid() is not null);
create policy "permission admin" on public.table_permissions for all using (public.current_role()='admin') with check (public.current_role()='admin');
create policy "field permission read" on public.field_permissions for select using (auth.uid() is not null);
create policy "field permission admin" on public.field_permissions for all using (public.current_role()='admin') with check (public.current_role()='admin');
create policy "entity read" on public.test_entities for select using (public.has_table_access('test_entities','read'));
create policy "entity write" on public.test_entities for all using (public.has_table_access('test_entities','write')) with check (public.has_table_access('test_entities','write'));
create policy "audit read" on public.audit_log for select using (public.has_table_access('audit_log','read'));
create policy "languages public read" on public.languages for select using (true);
create policy "languages admin write" on public.languages for all using (public.current_role()='admin') with check (public.current_role()='admin');
create policy "keys public read" on public.translation_keys for select using (true);
create policy "keys admin write" on public.translation_keys for all using (public.current_role()='admin') with check (public.current_role()='admin');
create policy "values public read" on public.translation_values for select using (true);
create policy "values admin write" on public.translation_values for all using (public.current_role()='admin') with check (public.current_role()='admin');

insert into public.languages(code,name) values ('hu','Magyar'),('en','English'),('de','Deutsch');
insert into public.table_permissions(role,table_name,access) values
 ('admin','test_entities','write'),('admin','audit_log','read'),('admin','translations','write'),
 ('editor','test_entities','write'),('editor','audit_log','read'),('viewer','test_entities','read');
insert into public.field_permissions(role,table_name,field_name,access)
select role,'test_entities',field,access from (values
 ('admin'::public.app_role,'code','write'::public.access_level),('admin','name','write'),('admin','owner','write'),('admin','status','write'),('admin','risk','write'),
 ('editor','code','read'),('editor','name','write'),('editor','owner','write'),('editor','status','write'),('editor','risk','read'),
 ('viewer','code','read'),('viewer','name','read'),('viewer','owner','read'),('viewer','status','read'),('viewer','risk','deny')
) as p(role,field,access);
insert into public.translation_keys(key) values
 ('app_title'),('app_subtitle'),('nav_entities'),('nav_users'),('nav_permissions'),('nav_audit'),('nav_languages'),('new'),('edit'),('delete'),('save'),('cancel'),('code'),('name'),('owner'),('status'),('risk'),('active'),('draft'),('low'),('medium'),('high'),('access'),('role'),('email'),('table_access'),('column_access'),('read'),('write'),('deny'),('actor'),('table'),('field'),('before'),('after'),('when'),('add_language'),('language_code'),('language_name'),('translation_key'),('translation_value'),('add_user'),('no_access'),('demo_user'),('confirm_delete'),('actions'),('empty'),('close'),('language'),('audit_hint'),('saved'),('deleted'),('admin_only');
-- Application seed values are represented in server.js and can be imported with the admin translation UI.
grant execute on function public.current_role(), public.has_table_access(text,public.access_level), public.has_field_access(text,text,public.access_level), public.read_test_entities(), public.write_test_entity(uuid,jsonb) to authenticated;
