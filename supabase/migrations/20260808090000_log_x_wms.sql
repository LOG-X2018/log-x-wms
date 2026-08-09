-- LOG-X WMS: per-user table/field permissions, immutable field audit and translations.
create schema if not exists private;
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.access_level as enum ('deny', 'read', 'write');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_table_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_key text not null,
  access public.access_level not null default 'deny',
  primary key (user_id, resource_key)
);
create index user_table_permissions_resource_idx on public.user_table_permissions(resource_key);
create table public.user_field_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_key text not null,
  field_name text not null,
  access public.access_level not null default 'deny',
  primary key (user_id, resource_key, field_name)
);
create index user_field_permissions_resource_idx on public.user_field_permissions(resource_key, field_name);
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
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  table_name text not null,
  record_key jsonb not null default '{}'::jsonb,
  operation text not null check (operation in ('create','update','remove','permission_change')),
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_log_occurred_idx on public.audit_log(occurred_at desc, id desc);
create index audit_log_table_idx on public.audit_log(table_name, occurred_at desc);
create index audit_log_actor_idx on public.audit_log(actor_id, occurred_at desc);
create table public.languages (code text primary key check (code ~ '^[a-z]{2,8}$'), name text not null, enabled boolean not null default true);
create table public.translation_keys (key text primary key);
create table public.translation_values (
  language_code text not null references public.languages(code) on delete cascade,
  key text not null references public.translation_keys(key) on delete cascade,
  value text not null,
  primary key (language_code, key)
);
create index translation_values_key_idx on public.translation_values(key);
create table public.option_dictionaries (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  english_name text not null check (btrim(english_name) <> ''),
  enabled boolean not null default true
);
create table public.dictionary_options (
  dictionary_key text not null references public.option_dictionaries(key) on delete cascade,
  option_code text not null check (option_code ~ '^[a-z][a-z0-9_]*$'),
  translation_key text not null unique check (translation_key ~ '^option\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  english_name text not null check (btrim(english_name) <> ''),
  sort_order integer not null default 0,
  enabled boolean not null default true,
  primary key (dictionary_key, option_code)
);
create table public.dictionary_option_labels (
  dictionary_key text not null,
  option_code text not null,
  language_code text not null references public.languages(code) on delete cascade,
  label text not null,
  primary key (dictionary_key, option_code, language_code),
  foreign key (dictionary_key, option_code) references public.dictionary_options(dictionary_key, option_code) on delete cascade
);
create index dictionary_option_labels_language_idx on public.dictionary_option_labels(language_code);
alter table public.test_entities
  add column status_dictionary_key text generated always as ('status') stored,
  add column risk_dictionary_key text generated always as ('risk') stored,
  add constraint test_entities_status_dictionary_fk foreign key (status_dictionary_key,status) references public.dictionary_options(dictionary_key,option_code),
  add constraint test_entities_risk_dictionary_fk foreign key (risk_dictionary_key,risk) references public.dictionary_options(dictionary_key,option_code);
create index test_entities_status_dictionary_idx on public.test_entities(status_dictionary_key,status);
create index test_entities_risk_dictionary_idx on public.test_entities(risk_dictionary_key,risk);

create or replace function private.table_access(target_user uuid, target_resource text)
returns public.access_level language sql stable security definer set search_path = '' as $$
  select coalesce((select p.access from public.user_table_permissions p where p.user_id=target_user and p.resource_key=target_resource), 'deny'::public.access_level)
$$;
create or replace function private.field_access(target_user uuid, target_resource text, target_field text)
returns public.access_level language sql stable security definer set search_path = '' as $$
  with levels as (
    select private.table_access(target_user,target_resource) table_level,
      coalesce((select p.access from public.user_field_permissions p where p.user_id=target_user and p.resource_key=target_resource and p.field_name=target_field), private.table_access(target_user,target_resource)) field_level
  ) select case when table_level='deny' then 'deny'::public.access_level when table_level='read' and field_level='write' then 'read'::public.access_level else field_level end from levels
$$;
create or replace function private.permission_resources()
returns table(resource_key text) language sql immutable security invoker set search_path = '' as $$
  values
    ('test_entities'::text),
    ('users'::text),
    ('permissions'::text),
    ('audit_log'::text),
    ('translations'::text)
$$;
create or replace function private.permission_fields()
returns table(resource_key text,field_name text) language sql immutable security invoker set search_path = '' as $$
  values
    ('test_entities'::text,'code'::text),
    ('test_entities'::text,'name'::text),
    ('test_entities'::text,'owner'::text),
    ('test_entities'::text,'status'::text),
    ('test_entities'::text,'risk'::text),
    ('users'::text,'name'::text),
    ('users'::text,'email'::text),
    ('users'::text,'role'::text),
    ('users'::text,'active'::text),
    ('audit_log'::text,'actor'::text),
    ('audit_log'::text,'table'::text),
    ('audit_log'::text,'record'::text),
    ('audit_log'::text,'action'::text),
    ('audit_log'::text,'field'::text),
    ('audit_log'::text,'before'::text),
    ('audit_log'::text,'after'::text),
    ('audit_log'::text,'when'::text),
    ('translations'::text,'language'::text),
    ('translations'::text,'translation_key'::text),
    ('translations'::text,'translation_value'::text)
$$;
create or replace function private.is_active_admin(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=target_user and p.active and p.role='admin')
$$;
create or replace function private.filtered_profile(target_profile public.profiles,target_viewer uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',(target_profile).id)
    || case when private.field_access(target_viewer,'users','name')>='read' then jsonb_build_object('name',(target_profile).display_name) else '{}'::jsonb end
    || case when private.field_access(target_viewer,'users','role')>='read' then jsonb_build_object('role',(target_profile).role) else '{}'::jsonb end
    || case when private.field_access(target_viewer,'users','active')>='read' then jsonb_build_object('active',(target_profile).active) else '{}'::jsonb end
$$;
create or replace function private.audit_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_data jsonb := case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_data jsonb := case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
  item text;
  actor uuid := (select auth.uid());
  actor_label text;
  operation_name text;
  record_data jsonb;
begin
  if actor is null then return coalesce(new,old); end if;
  select p.display_name into actor_label from public.profiles p where p.id=actor;
  operation_name := case tg_op when 'INSERT' then 'create' when 'DELETE' then 'remove' else case when tg_table_name like '%permission%' then 'permission_change' else 'update' end end;
  record_data := jsonb_strip_nulls(jsonb_build_object('id',coalesce(new_data->'id',old_data->'id'),'user_id',coalesce(new_data->'user_id',old_data->'user_id'),'resource_key',coalesce(new_data->'resource_key',old_data->'resource_key'),'code',coalesce(new_data->'code',old_data->'code'),'key',coalesce(new_data->'key',old_data->'key'),'dictionary_key',coalesce(new_data->'dictionary_key',old_data->'dictionary_key'),'option_code',coalesce(new_data->'option_code',old_data->'option_code'),'translation_key',coalesce(new_data->'translation_key',old_data->'translation_key'),'language_code',coalesce(new_data->'language_code',old_data->'language_code')));
  for item in select key from (select jsonb_object_keys(old_data) key union select jsonb_object_keys(new_data) key) keys where key not in ('created_at','updated_at','status_dictionary_key','risk_dictionary_key') loop
    if old_data->item is distinct from new_data->item then
      insert into public.audit_log(actor_id,actor_name,table_name,record_key,operation,field_name,old_value,new_value)
      values(actor,actor_label,tg_table_name,record_data,operation_name,item,old_data->item,new_data->item);
    end if;
  end loop;
  return coalesce(new,old);
end $$;

create trigger audit_test_entities after insert or update or delete on public.test_entities for each row execute function private.audit_changes();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function private.audit_changes();
create trigger audit_table_permissions after insert or update or delete on public.user_table_permissions for each row execute function private.audit_changes();
create trigger audit_field_permissions after insert or update or delete on public.user_field_permissions for each row execute function private.audit_changes();
create trigger audit_languages after insert or update or delete on public.languages for each row execute function private.audit_changes();
create trigger audit_translation_values after insert or update or delete on public.translation_values for each row execute function private.audit_changes();
create trigger audit_option_dictionaries after insert or update or delete on public.option_dictionaries for each row execute function private.audit_changes();
create trigger audit_dictionary_options after insert or update or delete on public.dictionary_options for each row execute function private.audit_changes();
create trigger audit_dictionary_option_labels after insert or update or delete on public.dictionary_option_labels for each row execute function private.audit_changes();

create or replace function private.seed_user_permissions(target_user uuid, target_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_table_permissions(user_id,resource_key,access) values
    (target_user,'test_entities',case when target_role='viewer' then 'read'::public.access_level else 'write'::public.access_level end),
    (target_user,'users',case when target_role='admin' then 'write'::public.access_level when target_role='editor' then 'read'::public.access_level else 'deny'::public.access_level end),
    (target_user,'permissions',case when target_role='admin' then 'write'::public.access_level else 'deny'::public.access_level end),
    (target_user,'audit_log',case when target_role in ('admin','editor') then 'read'::public.access_level else 'deny'::public.access_level end),
    (target_user,'translations',case when target_role='admin' then 'write'::public.access_level else 'deny'::public.access_level end)
  on conflict(user_id,resource_key) do nothing;
  insert into public.user_field_permissions(user_id,resource_key,field_name,access)
  select target_user,field.resource_key,field.field_name,case
    when field.resource_key='test_entities' and target_role='admin' then 'write'::public.access_level
    when field.resource_key='test_entities' and target_role='editor' and field.field_name in ('name','owner','status') then 'write'::public.access_level
    when field.resource_key='test_entities' and target_role='viewer' and field.field_name='risk' then 'deny'::public.access_level
    when field.resource_key='test_entities' then 'read'::public.access_level
    when field.resource_key='users' and target_role='admin' then 'write'::public.access_level
    when field.resource_key='users' and target_role='editor' then 'read'::public.access_level
    when field.resource_key='audit_log' and target_role in ('admin','editor') then 'read'::public.access_level
    when field.resource_key='translations' and target_role='admin' then 'write'::public.access_level
    else 'deny'::public.access_level end
  from private.permission_fields() field on conflict do nothing;
end $$;
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)),'viewer');
  perform private.seed_user_permissions(new.id,'viewer'); return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function public.read_test_entities()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('id',e.id,'code',case when private.field_access((select auth.uid()),'test_entities','code')>='read' then e.code end,'name',case when private.field_access((select auth.uid()),'test_entities','name')>='read' then e.name end,'owner',case when private.field_access((select auth.uid()),'test_entities','owner')>='read' then e.owner end,'status',case when private.field_access((select auth.uid()),'test_entities','status')>='read' then e.status end,'risk',case when private.field_access((select auth.uid()),'test_entities','risk')>='read' then e.risk end,'updatedAt',e.updated_at))
  from public.test_entities e where (select auth.uid()) is not null and private.table_access((select auth.uid()),'test_entities')>='read'
$$;
create or replace function public.write_test_entity(target_id uuid, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result public.test_entities; item text;
begin
  if (select auth.uid()) is null or private.table_access((select auth.uid()),'test_entities')<>'write' then raise exception 'access denied'; end if;
  for item in select jsonb_object_keys(payload) loop if private.field_access((select auth.uid()),'test_entities',item)<>'write' then raise exception 'field access denied: %',item; end if; end loop;
  if target_id is null then insert into public.test_entities(code,name,owner,status,risk) values(payload->>'code',payload->>'name',payload->>'owner',coalesce(payload->>'status','draft'),coalesce(payload->>'risk','medium')) returning * into result;
  else update public.test_entities set code=coalesce(payload->>'code',code),name=coalesce(payload->>'name',name),owner=coalesce(payload->>'owner',owner),status=coalesce(payload->>'status',status),risk=coalesce(payload->>'risk',risk),updated_at=now() where id=target_id returning * into result; if not found then raise exception 'not found'; end if; end if;
  return (select value from public.read_test_entities() value where value->>'id'=result.id::text);
end $$;
create or replace function public.delete_test_entity(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin if (select auth.uid()) is null or private.table_access((select auth.uid()),'test_entities')<>'write' then raise exception 'access denied'; end if; delete from public.test_entities where id=target_id; if not found then raise exception 'not found'; end if; end $$;
create or replace function public.read_permission_matrix()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when (select auth.uid()) is not null and private.table_access((select auth.uid()),'permissions')>='read' then jsonb_build_object(
    'resources',(select jsonb_agg(jsonb_build_object(
      'resourceKey',resource.resource_key,
      'fields',coalesce((select jsonb_agg(field.field_name order by field.field_name) from private.permission_fields() field where field.resource_key=resource.resource_key),'[]'::jsonb)
    ) order by resource.resource_key) from private.permission_resources() resource),
    'tables',coalesce((select jsonb_agg(to_jsonb(permission) order by permission.user_id,permission.resource_key) from public.user_table_permissions permission),'[]'::jsonb),
    'fields',coalesce((select jsonb_agg(to_jsonb(permission) order by permission.user_id,permission.resource_key,permission.field_name) from public.user_field_permissions permission),'[]'::jsonb)
  ) else null end
$$;
create or replace function public.write_user_permission(target_user uuid,target_resource text,target_field text,next_access public.access_level)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or private.table_access(caller_id,'permissions')<>'write' then raise exception 'access denied'; end if;
  if not exists(select 1 from public.profiles profile where profile.id=target_user) then raise exception 'unknown user'; end if;
  if not exists(select 1 from private.permission_resources() resource where resource.resource_key=target_resource) then raise exception 'unknown permission resource: %',target_resource; end if;
  if target_field is not null and not exists(select 1 from private.permission_fields() field where field.resource_key=target_resource and field.field_name=target_field) then raise exception 'unknown permission field: %.%',target_resource,target_field; end if;
  if target_user=caller_id and target_resource='permissions' and target_field is null and next_access<>'write' then raise exception 'cannot remove own permission access'; end if;
  if target_field is null then insert into public.user_table_permissions(user_id,resource_key,access) values(target_user,target_resource,next_access) on conflict(user_id,resource_key) do update set access=excluded.access;
  else insert into public.user_field_permissions(user_id,resource_key,field_name,access) values(target_user,target_resource,target_field,next_access) on conflict(user_id,resource_key,field_name) do update set access=excluded.access; end if;
end $$;

-- Auth identities and e-mail addresses are owned by Supabase Auth, not public.profiles.
-- A trusted server must create/invite and delete Auth users through supabase.auth.admin
-- with a service-role/secret key that is never exposed to the browser. These RPCs only
-- manage the app-owned profile row for an already existing Auth UUID; they intentionally
-- never insert, update or delete auth.users. The trusted adapter may merge Admin API e-mail
-- data only after applying the caller's users.email field permission.
-- New Auth users are normally provisioned by on_auth_user_created, after which the adapter
-- should call update_profile; create_profile exists for Auth identities that predate this migration.
create or replace function public.read_profiles()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  with caller as (select (select auth.uid()) id)
  select private.filtered_profile(profile,caller.id)
  from public.profiles profile cross join caller
  where caller.id is not null
    and private.is_active_admin(caller.id)
    and private.table_access(caller.id,'users')>='read'
  order by profile.id
$$;
create or replace function public.create_profile(target_user uuid,payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  result public.profiles;
  item text;
  requested_role public.app_role := 'viewer';
  requested_active boolean := true;
begin
  if caller_id is null or not private.is_active_admin(caller_id) or private.table_access(caller_id,'users')<>'write' then raise exception 'access denied'; end if;
  if target_user is null or coalesce(jsonb_typeof(payload),'null')<>'object' then raise exception 'invalid profile'; end if;
  if exists(select 1 from public.profiles profile where profile.id=target_user) then raise exception 'profile already exists'; end if;
  for item in select jsonb_object_keys(payload) loop
    if item='email' then raise exception 'auth e-mail requires the trusted Admin API'; end if;
    if item not in ('name','role','active') then raise exception 'unknown profile field: %',item; end if;
    if private.field_access(caller_id,'users',item)<>'write' then raise exception 'field access denied: %',item; end if;
  end loop;
  if private.field_access(caller_id,'users','name')<>'write' or btrim(coalesce(payload->>'name',''))='' then raise exception 'invalid profile name'; end if;
  if payload ? 'role' and payload->>'role' not in ('admin','editor','viewer') then raise exception 'invalid profile role'; end if;
  if payload ? 'active' and jsonb_typeof(payload->'active')<>'boolean' then raise exception 'invalid profile active flag'; end if;
  if payload ? 'role' then requested_role := (payload->>'role')::public.app_role; end if;
  if payload ? 'active' then requested_active := (payload->>'active')::boolean; end if;
  insert into public.profiles(id,display_name,role,active)
  values(target_user,btrim(payload->>'name'),requested_role,requested_active)
  returning * into result;
  perform private.seed_user_permissions(result.id,result.role);
  return private.filtered_profile(result,caller_id);
end $$;
create or replace function public.update_profile(target_user uuid,payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  current_profile public.profiles;
  result public.profiles;
  item text;
  requested_role public.app_role;
  requested_active boolean;
begin
  if caller_id is null or not private.is_active_admin(caller_id) or private.table_access(caller_id,'users')<>'write' then raise exception 'access denied'; end if;
  if target_user is null or coalesce(jsonb_typeof(payload),'null')<>'object' then raise exception 'invalid profile'; end if;
  select profile.* into current_profile from public.profiles profile where profile.id=target_user for update;
  if not found then raise exception 'profile not found'; end if;
  for item in select jsonb_object_keys(payload) loop
    if item='email' then raise exception 'auth e-mail requires the trusted Admin API'; end if;
    if item not in ('name','role','active') then raise exception 'unknown profile field: %',item; end if;
    if private.field_access(caller_id,'users',item)<>'write' then raise exception 'field access denied: %',item; end if;
  end loop;
  if payload ? 'name' and btrim(coalesce(payload->>'name',''))='' then raise exception 'invalid profile name'; end if;
  if payload ? 'role' and payload->>'role' not in ('admin','editor','viewer') then raise exception 'invalid profile role'; end if;
  if payload ? 'active' and jsonb_typeof(payload->'active')<>'boolean' then raise exception 'invalid profile active flag'; end if;
  requested_role := case when payload ? 'role' then (payload->>'role')::public.app_role else current_profile.role end;
  requested_active := case when payload ? 'active' then (payload->>'active')::boolean else current_profile.active end;
  if current_profile.role='admin' and current_profile.active and (requested_role<>'admin' or not requested_active) and (
    target_user=caller_id or not exists(select 1 from public.profiles other where other.id<>target_user and other.active and other.role='admin')
  ) then raise exception 'cannot disable or demote the current or last active admin'; end if;
  update public.profiles
  set display_name=case when payload ? 'name' then btrim(payload->>'name') else display_name end,
      role=requested_role,
      active=requested_active,
      updated_at=now()
  where id=target_user
  returning * into result;
  perform private.seed_user_permissions(result.id,result.role);
  return private.filtered_profile(result,caller_id);
end $$;
create or replace function public.delete_profile(target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  current_profile public.profiles;
begin
  if caller_id is null or not private.is_active_admin(caller_id) or private.table_access(caller_id,'users')<>'write' then raise exception 'access denied'; end if;
  select profile.* into current_profile from public.profiles profile where profile.id=target_user for update;
  if not found then raise exception 'profile not found'; end if;
  if target_user=caller_id or (current_profile.role='admin' and current_profile.active and not exists(
    select 1 from public.profiles other where other.id<>target_user and other.active and other.role='admin'
  )) then raise exception 'cannot delete the current or last active admin'; end if;
  delete from public.profiles where id=target_user;
end $$;
create or replace function public.read_audit_log(result_limit integer default 200)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  with caller as (select (select auth.uid()) id), allowed as (
    select
      private.field_access(caller.id,'audit_log','actor')>='read' can_actor,
      private.field_access(caller.id,'audit_log','table')>='read' can_table,
      private.field_access(caller.id,'audit_log','record')>='read' can_record,
      private.field_access(caller.id,'audit_log','action')>='read' can_action,
      private.field_access(caller.id,'audit_log','field')>='read' can_field,
      private.field_access(caller.id,'audit_log','before')>='read' can_before,
      private.field_access(caller.id,'audit_log','after')>='read' can_after,
      private.field_access(caller.id,'audit_log','when')>='read' can_when
    from caller
    where caller.id is not null and private.table_access(caller.id,'audit_log')>='read'
  )
  select jsonb_build_object('id',audit.id)
    || case when allowed.can_actor then jsonb_build_object('actorId',audit.actor_id,'actor',audit.actor_name) else '{}'::jsonb end
    || case when allowed.can_table then jsonb_build_object('table',audit.table_name) else '{}'::jsonb end
    || case when allowed.can_record then jsonb_build_object('record',audit.record_key) else '{}'::jsonb end
    || case when allowed.can_action then jsonb_build_object('action',audit.operation) else '{}'::jsonb end
    || case when allowed.can_field then jsonb_build_object('field',audit.field_name) else '{}'::jsonb end
    || case when allowed.can_before then jsonb_build_object('before',audit.old_value) else '{}'::jsonb end
    || case when allowed.can_after then jsonb_build_object('after',audit.new_value) else '{}'::jsonb end
    || case when allowed.can_when then jsonb_build_object('when',audit.occurred_at) else '{}'::jsonb end
  from public.audit_log audit cross join allowed
  order by audit.occurred_at desc,audit.id desc
  limit least(greatest(coalesce(result_limit,200),1),500)
$$;
create or replace function public.read_dictionaries(target_language text default 'hu')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with selected as (
    select coalesce(
      (select l.code from public.languages l where l.code=target_language and l.enabled),
      (select l.code from public.languages l where l.code='hu' and l.enabled),
      (select l.code from public.languages l where l.enabled order by l.code limit 1),
      'en'
    ) code
  ), dictionary_rows as (
    select d.key, jsonb_build_object(
      'key',d.key,
      'englishName',d.english_name,
      'options',coalesce((
        select jsonb_agg(jsonb_build_object(
          'code',o.option_code,
          'key',o.translation_key,
          'englishName',o.english_name,
          'label',coalesce(target_label.label,english_label.label,o.english_name),
          'labels',coalesce((select jsonb_object_agg(labels.language_code,labels.label) from public.dictionary_option_labels labels where labels.dictionary_key=o.dictionary_key and labels.option_code=o.option_code),'{}'::jsonb)
        ) order by o.sort_order,o.option_code)
        from public.dictionary_options o
        left join public.dictionary_option_labels target_label on target_label.dictionary_key=o.dictionary_key and target_label.option_code=o.option_code and target_label.language_code=(select code from selected)
        left join public.dictionary_option_labels english_label on english_label.dictionary_key=o.dictionary_key and english_label.option_code=o.option_code and english_label.language_code='en'
        where o.dictionary_key=d.key and o.enabled
      ),'[]'::jsonb)
    ) value
    from public.option_dictionaries d where d.enabled
  )
  select coalesce(jsonb_object_agg(dictionary_rows.key,dictionary_rows.value),'{}'::jsonb) from dictionary_rows
$$;
create or replace function public.read_translation_editor(target_language text default 'hu')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with selected as (
    select coalesce(
      (select l.code from public.languages l where l.code=target_language and l.enabled),
      (select l.code from public.languages l where l.code='hu' and l.enabled),
      (select l.code from public.languages l where l.enabled order by l.code limit 1),
      'en'
    ) code
  ), entries as (
    select k.key,'ui'::text scope,null::text dictionary_key,null::text option_code,coalesce(english.value,k.key) english,coalesce(target.value,english.value,k.key) target
    from public.translation_keys k
    left join public.translation_values english on english.key=k.key and english.language_code='en'
    left join public.translation_values target on target.key=k.key and target.language_code=(select code from selected)
    union all
    select o.translation_key,'option'::text,o.dictionary_key,o.option_code,o.english_name,coalesce(target.label,english.label,o.english_name)
    from public.dictionary_options o
    left join public.dictionary_option_labels english on english.dictionary_key=o.dictionary_key and english.option_code=o.option_code and english.language_code='en'
    left join public.dictionary_option_labels target on target.dictionary_key=o.dictionary_key and target.option_code=o.option_code and target.language_code=(select code from selected)
  )
  select jsonb_build_object(
    'sourceLanguage','en',
    'targetLanguage',(select code from selected),
    'entries',(select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('key',entries.key,'scope',entries.scope,'dictionaryKey',entries.dictionary_key,'optionCode',entries.option_code,'english',entries.english,'target',entries.target)) order by entries.scope,entries.key),'[]'::jsonb) from entries)
  )
$$;
create or replace function public.add_language(target_code text,target_name text)
returns public.languages language plpgsql security definer set search_path = '' as $$
declare normalized_code text := lower(btrim(target_code)); created public.languages;
begin
  if (select auth.uid()) is null or private.table_access((select auth.uid()),'translations')<>'write' then raise exception 'access denied'; end if;
  if normalized_code is null or normalized_code !~ '^[a-z]{2,8}$' or btrim(coalesce(target_name,''))='' then raise exception 'invalid language'; end if;
  insert into public.languages(code,name,enabled) values(normalized_code,btrim(target_name),true) returning * into created;
  insert into public.translation_values(language_code,key,value) select normalized_code,source.key,source.value from public.translation_values source where source.language_code='en';
  insert into public.dictionary_option_labels(dictionary_key,option_code,language_code,label) select option.dictionary_key,option.option_code,normalized_code,option.english_name from public.dictionary_options option;
  return created;
end $$;
create or replace function public.write_translation(target_language text,target_key text,target_value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare normalized_language text := lower(btrim(target_language)); option_row public.dictionary_options;
begin
  if (select auth.uid()) is null or private.table_access((select auth.uid()),'translations')<>'write' then raise exception 'access denied'; end if;
  if not exists(select 1 from public.languages l where l.code=normalized_language) then raise exception 'unknown language'; end if;
  if target_value is null then raise exception 'invalid translation'; end if;
  if exists(select 1 from public.translation_keys k where k.key=target_key) then
    insert into public.translation_values(language_code,key,value) values(normalized_language,target_key,target_value)
    on conflict(language_code,key) do update set value=excluded.value;
  else
    select option.* into option_row from public.dictionary_options option where option.translation_key=target_key;
    if not found then raise exception 'unknown translation key'; end if;
    if normalized_language='en' then update public.dictionary_options set english_name=target_value where dictionary_key=option_row.dictionary_key and option_code=option_row.option_code; end if;
    insert into public.dictionary_option_labels(dictionary_key,option_code,language_code,label) values(option_row.dictionary_key,option_row.option_code,normalized_language,target_value)
    on conflict(dictionary_key,option_code,language_code) do update set label=excluded.label;
  end if;
  return public.read_translation_editor(normalized_language);
end $$;

alter table public.profiles enable row level security;
alter table public.user_table_permissions enable row level security;
alter table public.user_field_permissions enable row level security;
alter table public.test_entities enable row level security;
alter table public.audit_log enable row level security;
alter table public.languages enable row level security;
alter table public.translation_keys enable row level security;
alter table public.translation_values enable row level security;
alter table public.option_dictionaries enable row level security;
alter table public.dictionary_options enable row level security;
alter table public.dictionary_option_labels enable row level security;
create policy languages_read on public.languages for select to anon,authenticated using (true);
create policy translation_keys_read on public.translation_keys for select to anon,authenticated using (true);
create policy translation_values_read on public.translation_values for select to anon,authenticated using (true);
create policy option_dictionaries_read on public.option_dictionaries for select to anon,authenticated using (true);
create policy dictionary_options_read on public.dictionary_options for select to anon,authenticated using (true);
create policy dictionary_option_labels_read on public.dictionary_option_labels for select to anon,authenticated using (true);

revoke all on public.profiles,public.user_table_permissions,public.user_field_permissions,public.test_entities,public.audit_log,public.languages,public.translation_keys,public.translation_values,public.option_dictionaries,public.dictionary_options,public.dictionary_option_labels from anon,authenticated;
grant select on public.languages,public.translation_keys,public.translation_values,public.option_dictionaries,public.dictionary_options,public.dictionary_option_labels to anon,authenticated;
grant all on public.profiles,public.user_table_permissions,public.user_field_permissions,public.test_entities,public.audit_log,public.languages,public.translation_keys,public.translation_values,public.option_dictionaries,public.dictionary_options,public.dictionary_option_labels to service_role;
revoke execute on all functions in schema private from public,anon,authenticated,service_role;
revoke execute on function
  public.read_test_entities(),
  public.write_test_entity(uuid,jsonb),
  public.delete_test_entity(uuid),
  public.read_permission_matrix(),
  public.write_user_permission(uuid,text,text,public.access_level),
  public.read_profiles(),
  public.create_profile(uuid,jsonb),
  public.update_profile(uuid,jsonb),
  public.delete_profile(uuid),
  public.read_audit_log(integer),
  public.read_dictionaries(text),
  public.read_translation_editor(text),
  public.add_language(text,text),
  public.write_translation(text,text,text)
from public,anon,authenticated,service_role;
grant execute on function
  public.read_test_entities(),
  public.write_test_entity(uuid,jsonb),
  public.delete_test_entity(uuid),
  public.read_permission_matrix(),
  public.write_user_permission(uuid,text,text,public.access_level),
  public.read_profiles(),
  public.create_profile(uuid,jsonb),
  public.update_profile(uuid,jsonb),
  public.delete_profile(uuid),
  public.read_audit_log(integer),
  public.add_language(text,text),
  public.write_translation(text,text,text)
to authenticated,service_role;
grant execute on function public.read_dictionaries(text),public.read_translation_editor(text) to anon,authenticated,service_role;

insert into public.languages(code,name) values ('hu','Magyar'),('en','English'),('de','Deutsch');
insert into public.translation_keys(key) values
  ('access'),
  ('action'),
  ('actions'),
  ('active'),
  ('actor'),
  ('add_language'),
  ('add_user'),
  ('admin_only'),
  ('after'),
  ('app_subtitle'),
  ('app_title'),
  ('audit_hint'),
  ('before'),
  ('cancel'),
  ('close'),
  ('code'),
  ('column_access'),
  ('confirm_delete'),
  ('confirm_delete_user'),
  ('create'),
  ('delete'),
  ('deleted'),
  ('demo_security_warning'),
  ('demo_user'),
  ('deny'),
  ('draft'),
  ('edit'),
  ('edit_user'),
  ('email'),
  ('empty'),
  ('field'),
  ('high'),
  ('inactive'),
  ('language'),
  ('language_code'),
  ('language_name'),
  ('low'),
  ('medium'),
  ('modifiable'),
  ('name'),
  ('nav_audit'),
  ('nav_entities'),
  ('nav_languages'),
  ('nav_permissions'),
  ('nav_users'),
  ('new'),
  ('no_access'),
  ('owner'),
  ('permission_change'),
  ('permission_hint'),
  ('permissions_locked'),
  ('read'),
  ('record'),
  ('remove'),
  ('risk'),
  ('role'),
  ('role_admin'),
  ('role_editor'),
  ('role_viewer'),
  ('save'),
  ('saved'),
  ('scope'),
  ('status'),
  ('table'),
  ('table_access'),
  ('translation_key'),
  ('translation_value'),
  ('update'),
  ('visible'),
  ('when'),
  ('write')
on conflict(key) do nothing;
insert into public.translation_values(language_code,key,value) values
  ('hu','app_title','LOG-X WMS'),
  ('hu','app_subtitle','Adatvezérelt validációs környezet'),
  ('hu','nav_entities','Teszt-entitások'),
  ('hu','nav_users','Felhasználók'),
  ('hu','nav_permissions','Jogosultságok'),
  ('hu','nav_audit','Auditnapló'),
  ('hu','nav_languages','Nyelvek'),
  ('hu','new','Új rekord'),
  ('hu','edit','Szerkesztés'),
  ('hu','delete','Törlés'),
  ('hu','save','Mentés'),
  ('hu','cancel','Mégse'),
  ('hu','actions','Műveletek'),
  ('hu','code','Kód'),
  ('hu','name','Név'),
  ('hu','owner','Felelős'),
  ('hu','status','Állapot'),
  ('hu','risk','Kockázat'),
  ('hu','active','Aktív'),
  ('hu','inactive','Inaktív'),
  ('hu','draft','Piszkozat'),
  ('hu','low','Alacsony'),
  ('hu','medium','Közepes'),
  ('hu','high','Magas'),
  ('hu','access','Hozzáférés'),
  ('hu','role','Szerepkör'),
  ('hu','email','E-mail'),
  ('hu','table_access','Táblaszint'),
  ('hu','column_access','Mezőszint'),
  ('hu','read','Csak olvasás'),
  ('hu','write','Módosítható'),
  ('hu','deny','Tiltva'),
  ('hu','actor','Ki'),
  ('hu','table','Tábla'),
  ('hu','field','Mező'),
  ('hu','before','Korábbi érték'),
  ('hu','after','Új érték'),
  ('hu','when','Mikor'),
  ('hu','action','Művelet'),
  ('hu','record','Rekord'),
  ('hu','add_language','Új nyelv'),
  ('hu','language_code','Nyelvkód'),
  ('hu','language_name','Nyelv neve'),
  ('hu','translation_key','Fordítási kulcs'),
  ('hu','translation_value','Érték'),
  ('hu','add_user','Felhasználó hozzáadása'),
  ('hu','edit_user','Felhasználó szerkesztése'),
  ('hu','confirm_delete','Valóban törlöd ezt a rekordot?'),
  ('hu','confirm_delete_user','Valóban törlöd ezt a felhasználót?'),
  ('hu','no_access','Nincs hozzáférésed ehhez a területhez.'),
  ('hu','demo_user','Aktív demo felhasználó'),
  ('hu','empty','Nincs megjeleníthető adat.'),
  ('hu','close','Bezárás'),
  ('hu','language','Nyelv'),
  ('hu','audit_hint','Minden módosítás mezőszinten kerül naplózásra.'),
  ('hu','permission_hint','Felhasználónként állítsd be a táblák és mezők láthatóságát, valamint módosíthatóságát.'),
  ('hu','saved','Sikeresen mentve.'),
  ('hu','deleted','Sikeresen törölve.'),
  ('hu','admin_only','Csak megfelelő jogosultsággal.'),
  ('hu','visible','Láthatja'),
  ('hu','modifiable','Módosíthatja'),
  ('hu','scope','Tábla vagy mező'),
  ('hu','role_admin','Adminisztrátor'),
  ('hu','role_editor','Szerkesztő'),
  ('hu','role_viewer','Megtekintő'),
  ('hu','permissions_locked','A saját jogosultságkezelési hozzáférésed nem tiltható le.'),
  ('hu','create','Létrehozás'),
  ('hu','update','Módosítás'),
  ('hu','remove','Törlés'),
  ('hu','permission_change','Jogosultságmódosítás'),
  ('en','app_title','LOG-X WMS'),
  ('en','app_subtitle','Data-driven validation environment'),
  ('en','nav_entities','Test entities'),
  ('en','nav_users','Users'),
  ('en','nav_permissions','Permissions'),
  ('en','nav_audit','Audit log'),
  ('en','nav_languages','Languages'),
  ('en','new','New record'),
  ('en','edit','Edit'),
  ('en','delete','Delete'),
  ('en','save','Save'),
  ('en','cancel','Cancel'),
  ('en','actions','Actions'),
  ('en','code','Code'),
  ('en','name','Name'),
  ('en','owner','Owner'),
  ('en','status','Status'),
  ('en','risk','Risk'),
  ('en','active','Active'),
  ('en','inactive','Inactive'),
  ('en','draft','Draft'),
  ('en','low','Low'),
  ('en','medium','Medium'),
  ('en','high','High'),
  ('en','access','Access'),
  ('en','role','Role'),
  ('en','email','Email'),
  ('en','table_access','Table level'),
  ('en','column_access','Field level'),
  ('en','read','Read only'),
  ('en','write','Editable'),
  ('en','deny','Denied'),
  ('en','actor','Actor'),
  ('en','table','Table'),
  ('en','field','Field'),
  ('en','before','Before'),
  ('en','after','After'),
  ('en','when','When'),
  ('en','action','Action'),
  ('en','record','Record'),
  ('en','add_language','Add language'),
  ('en','language_code','Language code'),
  ('en','language_name','Language name'),
  ('en','translation_key','Translation key'),
  ('en','translation_value','Value'),
  ('en','add_user','Add user'),
  ('en','edit_user','Edit user'),
  ('en','confirm_delete','Delete this record?'),
  ('en','confirm_delete_user','Delete this user?'),
  ('en','no_access','You do not have access to this area.'),
  ('en','demo_user','Active demo user'),
  ('en','empty','No data to display.'),
  ('en','close','Close'),
  ('en','language','Language'),
  ('en','audit_hint','Every change is recorded at field level.'),
  ('en','permission_hint','Set table and field visibility and editability for each user.'),
  ('en','saved','Saved successfully.'),
  ('en','deleted','Deleted successfully.'),
  ('en','admin_only','Requires sufficient permission.'),
  ('en','visible','Can view'),
  ('en','modifiable','Can edit'),
  ('en','scope','Table or field'),
  ('en','role_admin','Administrator'),
  ('en','role_editor','Editor'),
  ('en','role_viewer','Viewer'),
  ('en','permissions_locked','You cannot remove your own permission-management access.'),
  ('en','create','Create'),
  ('en','update','Update'),
  ('en','remove','Delete'),
  ('en','permission_change','Permission change'),
  ('de','app_title','LOG-X WMS'),
  ('de','app_subtitle','Datengesteuerte Validierungsumgebung'),
  ('de','nav_entities','Testentitäten'),
  ('de','nav_users','Benutzer'),
  ('de','nav_permissions','Berechtigungen'),
  ('de','nav_audit','Auditprotokoll'),
  ('de','nav_languages','Sprachen'),
  ('de','new','Neuer Datensatz'),
  ('de','edit','Bearbeiten'),
  ('de','delete','Löschen'),
  ('de','save','Speichern'),
  ('de','cancel','Abbrechen'),
  ('de','actions','Aktionen'),
  ('de','code','Code'),
  ('de','name','Name'),
  ('de','owner','Verantwortlich'),
  ('de','status','Status'),
  ('de','risk','Risiko'),
  ('de','active','Aktiv'),
  ('de','inactive','Inaktiv'),
  ('de','draft','Entwurf'),
  ('de','low','Niedrig'),
  ('de','medium','Mittel'),
  ('de','high','Hoch'),
  ('de','access','Zugriff'),
  ('de','role','Rolle'),
  ('de','email','E-Mail'),
  ('de','table_access','Tabellenebene'),
  ('de','column_access','Feldebene'),
  ('de','read','Nur lesen'),
  ('de','write','Bearbeitbar'),
  ('de','deny','Gesperrt'),
  ('de','actor','Akteur'),
  ('de','table','Tabelle'),
  ('de','field','Feld'),
  ('de','before','Vorher'),
  ('de','after','Nachher'),
  ('de','when','Wann'),
  ('de','action','Aktion'),
  ('de','record','Datensatz'),
  ('de','add_language','Sprache hinzufügen'),
  ('de','language_code','Sprachcode'),
  ('de','language_name','Sprachname'),
  ('de','translation_key','Übersetzungsschlüssel'),
  ('de','translation_value','Wert'),
  ('de','add_user','Benutzer hinzufügen'),
  ('de','edit_user','Benutzer bearbeiten'),
  ('de','confirm_delete','Diesen Datensatz löschen?'),
  ('de','confirm_delete_user','Diesen Benutzer löschen?'),
  ('de','no_access','Sie haben keinen Zugriff auf diesen Bereich.'),
  ('de','demo_user','Aktiver Demo-Benutzer'),
  ('de','empty','Keine Daten vorhanden.'),
  ('de','close','Schließen'),
  ('de','language','Sprache'),
  ('de','audit_hint','Jede Änderung wird auf Feldebene protokolliert.'),
  ('de','permission_hint','Tabellen- und Feldsichtbarkeit sowie Bearbeitbarkeit pro Benutzer festlegen.'),
  ('de','saved','Erfolgreich gespeichert.'),
  ('de','deleted','Erfolgreich gelöscht.'),
  ('de','admin_only','Entsprechende Berechtigung erforderlich.'),
  ('de','visible','Sichtbar'),
  ('de','modifiable','Bearbeitbar'),
  ('de','scope','Tabelle oder Feld'),
  ('de','role_admin','Administrator'),
  ('de','role_editor','Bearbeiter'),
  ('de','role_viewer','Betrachter'),
  ('de','permissions_locked','Der eigene Zugriff auf die Berechtigungsverwaltung kann nicht entfernt werden.'),
  ('de','create','Erstellen'),
  ('de','update','Ändern'),
  ('de','remove','Löschen'),
  ('de','permission_change','Berechtigungsänderung')
on conflict(language_code,key) do update set value=excluded.value;
insert into public.option_dictionaries(key,english_name) values ('status','Status'),('risk','Risk');
insert into public.dictionary_options(dictionary_key,option_code,translation_key,english_name,sort_order) values
  ('status','draft','option.status.draft','Draft',10),
  ('status','active','option.status.active','Active',20),
  ('risk','low','option.risk.low','Low',10),
  ('risk','medium','option.risk.medium','Medium',20),
  ('risk','high','option.risk.high','High',30);
insert into public.dictionary_option_labels(dictionary_key,option_code,language_code,label) values
  ('status','draft','en','Draft'),('status','draft','hu','Piszkozat'),('status','draft','de','Entwurf'),
  ('status','active','en','Active'),('status','active','hu','Aktív'),('status','active','de','Aktiv'),
  ('risk','low','en','Low'),('risk','low','hu','Alacsony'),('risk','low','de','Niedrig'),
  ('risk','medium','en','Medium'),('risk','medium','hu','Közepes'),('risk','medium','de','Mittel'),
  ('risk','high','en','High'),('risk','high','hu','Magas'),('risk','high','de','Hoch');

do $ui_seed$
declare language_row record;
begin
  for language_row in
  select seed.language_code,seed.payload || jsonb_build_object('demo_security_warning',case seed.language_code
    when 'hu' then 'Ez a nyilvános demó csak identitásváltást szimulál; nem használ valódi bejelentkezést.'
    when 'de' then 'Diese öffentliche Demo simuliert nur einen Identitätswechsel; sie verwendet keine echte Anmeldung.'
    else 'This public demo only simulates identity switching; it does not use real sign-in.' end) payload
  from (values
    ('hu','{"all_roles":"Minden szerepkör","role_filter":"Szerepkör szűrése","permission_user":"Felhasználó","no_field_permissions":"Ehhez a táblához nincs külön mezőjogosultság.","audit_filter_title":"Összetett szűrő","audit_filter_help":"Csoportokkal több szintű ÉS/VAGY feltételeket állíthatsz össze.","audit_filter_add":"Feltétel hozzáadása","audit_filter_add_group":"Csoport hozzáadása","audit_filter_reset":"Alaphelyzet","audit_filter_remove":"Feltétel törlése","audit_filter_remove_group":"Csoport törlése","audit_filter_group_join":"Csoportkapcsolat","audit_filter_where":"Ahol","audit_filter_and":"ÉS","audit_filter_or":"VAGY","audit_filter_group":"Csoport","audit_filter_group_mode":"Csoporton belül","audit_filter_all_conditions":"Minden feltétel (ÉS)","audit_filter_any_condition":"Bármely feltétel (VAGY)","audit_filter_field":"Mező","audit_filter_operator":"Feltétel","audit_filter_value":"Érték","audit_filter_value_placeholder":"Szűrési érték","audit_filter_select_value":"Válassz értéket","audit_filter_no_value":"Nem szükséges érték","audit_filter_empty_rules":"Még nincs feltétel ebben a csoportban.","audit_filter_results":"találat","audit_filter_no_results":"Nincs a feltételeknek megfelelő naplóbejegyzés.","audit_filter_operator_contains":"Tartalmazza","audit_filter_operator_not_contains":"Nem tartalmazza","audit_filter_operator_equals":"Egyenlő","audit_filter_operator_not_equals":"Nem egyenlő","audit_filter_operator_starts_with":"Ezzel kezdődik","audit_filter_operator_ends_with":"Erre végződik","audit_filter_operator_is_empty":"Üres","audit_filter_operator_is_not_empty":"Nem üres","audit_filter_operator_before":"Korábbi mint","audit_filter_operator_after":"Későbbi mint","audit_filter_operator_on_date":"Adott napon","translation_help":"Válassz célnyelvet; balra az eredeti angol, jobbra a szerkeszthető fordítás látható.","target_language":"Célnyelv","source_language":"Forrásnyelv","english_source":"Eredeti angol","target_translation":"Kiválasztott nyelv","dropdown_translations":"Legördülő mezők értékei","dropdown_translation_help":"Az adatbázis a stabil kódot használja, a felület a nyelvi megnevezést mutatja.","dictionary_key":"Törzsadat és kód","error_required":"Töltsd ki az összes kötelező mezőt.","error_invalid_option":"Érvénytelen legördülő érték.","error_duplicate":"Ez a kód vagy e-mail-cím már használatban van.","error_access":"Nincs jogosultságod ehhez a művelethez.","error_invalid_language":"A nyelvkód érvénytelen vagy már létezik.","error_unknown_translation":"Ismeretlen fordítási kulcs.","error_invalid_email":"Adj meg érvényes e-mail-címet.","error_invalid_user":"Érvénytelen felhasználói adat vagy szerepkör.","error_invalid_permission":"Érvénytelen jogosultsági beállítás.","error_protected_admin":"Az aktuális vagy az utolsó aktív adminisztrátor nem tiltható le és nem törölhető.","error_not_found":"A kért rekord nem található.","error_server":"Váratlan szerverhiba történt."}'::jsonb),
    ('en','{"all_roles":"All roles","role_filter":"Filter by role","permission_user":"User","no_field_permissions":"This table has no separate field permissions.","audit_filter_title":"Advanced filter","audit_filter_help":"Build multi-level AND/OR logic with condition groups.","audit_filter_add":"Add condition","audit_filter_add_group":"Add group","audit_filter_reset":"Reset","audit_filter_remove":"Remove condition","audit_filter_remove_group":"Remove group","audit_filter_group_join":"Group join","audit_filter_where":"Where","audit_filter_and":"AND","audit_filter_or":"OR","audit_filter_group":"Group","audit_filter_group_mode":"Inside group","audit_filter_all_conditions":"All conditions (AND)","audit_filter_any_condition":"Any condition (OR)","audit_filter_field":"Field","audit_filter_operator":"Operator","audit_filter_value":"Value","audit_filter_value_placeholder":"Filter value","audit_filter_select_value":"Select a value","audit_filter_no_value":"No value required","audit_filter_empty_rules":"No conditions in this group yet.","audit_filter_results":"results","audit_filter_no_results":"No audit entries match these conditions.","audit_filter_operator_contains":"Contains","audit_filter_operator_not_contains":"Does not contain","audit_filter_operator_equals":"Equals","audit_filter_operator_not_equals":"Does not equal","audit_filter_operator_starts_with":"Starts with","audit_filter_operator_ends_with":"Ends with","audit_filter_operator_is_empty":"Is empty","audit_filter_operator_is_not_empty":"Is not empty","audit_filter_operator_before":"Before","audit_filter_operator_after":"After","audit_filter_operator_on_date":"On date","translation_help":"Choose a target language; the original English is on the left and the editable translation is on the right.","target_language":"Target language","source_language":"Source language","english_source":"Original English","target_translation":"Selected language","dropdown_translations":"Dropdown values","dropdown_translation_help":"The database uses the stable code while the UI shows its localized label.","dictionary_key":"Dictionary and code","error_required":"Complete every required field.","error_invalid_option":"Invalid dropdown value.","error_duplicate":"This code or email address is already in use.","error_access":"You are not allowed to perform this action.","error_invalid_language":"The language code is invalid or already exists.","error_unknown_translation":"Unknown translation key.","error_invalid_email":"Enter a valid email address.","error_invalid_user":"Invalid user value or role.","error_invalid_permission":"Invalid permission setting.","error_protected_admin":"The current or last active administrator cannot be disabled or deleted.","error_not_found":"The requested record was not found.","error_server":"An unexpected server error occurred."}'::jsonb),
    ('de','{"all_roles":"Alle Rollen","role_filter":"Nach Rolle filtern","permission_user":"Benutzer","no_field_permissions":"Für diese Tabelle gibt es keine separaten Feldberechtigungen.","audit_filter_title":"Erweiterter Filter","audit_filter_help":"Erstellen Sie mehrstufige UND/ODER-Logik mit Bedingungsgruppen.","audit_filter_add":"Bedingung hinzufügen","audit_filter_add_group":"Gruppe hinzufügen","audit_filter_reset":"Zurücksetzen","audit_filter_remove":"Bedingung entfernen","audit_filter_remove_group":"Gruppe entfernen","audit_filter_group_join":"Gruppenverknüpfung","audit_filter_where":"Wo","audit_filter_and":"UND","audit_filter_or":"ODER","audit_filter_group":"Gruppe","audit_filter_group_mode":"Innerhalb der Gruppe","audit_filter_all_conditions":"Alle Bedingungen (UND)","audit_filter_any_condition":"Eine Bedingung (ODER)","audit_filter_field":"Feld","audit_filter_operator":"Operator","audit_filter_value":"Wert","audit_filter_value_placeholder":"Filterwert","audit_filter_select_value":"Wert auswählen","audit_filter_no_value":"Kein Wert erforderlich","audit_filter_empty_rules":"Noch keine Bedingungen in dieser Gruppe.","audit_filter_results":"Treffer","audit_filter_no_results":"Keine Audit-Einträge entsprechen diesen Bedingungen.","audit_filter_operator_contains":"Enthält","audit_filter_operator_not_contains":"Enthält nicht","audit_filter_operator_equals":"Ist gleich","audit_filter_operator_not_equals":"Ist nicht gleich","audit_filter_operator_starts_with":"Beginnt mit","audit_filter_operator_ends_with":"Endet mit","audit_filter_operator_is_empty":"Ist leer","audit_filter_operator_is_not_empty":"Ist nicht leer","audit_filter_operator_before":"Vor","audit_filter_operator_after":"Nach","audit_filter_operator_on_date":"Am Datum","translation_help":"Wählen Sie eine Zielsprache; links steht das englische Original, rechts die bearbeitbare Übersetzung.","target_language":"Zielsprache","source_language":"Quellsprache","english_source":"Englisches Original","target_translation":"Ausgewählte Sprache","dropdown_translations":"Werte der Auswahllisten","dropdown_translation_help":"Die Datenbank verwendet den stabilen Code, die Oberfläche zeigt die lokalisierte Bezeichnung.","dictionary_key":"Stammdaten und Code","error_required":"Füllen Sie alle Pflichtfelder aus.","error_invalid_option":"Ungültiger Auswahllistenwert.","error_duplicate":"Dieser Code oder diese E-Mail-Adresse wird bereits verwendet.","error_access":"Sie sind zu dieser Aktion nicht berechtigt.","error_invalid_language":"Der Sprachcode ist ungültig oder bereits vorhanden.","error_unknown_translation":"Unbekannter Übersetzungsschlüssel.","error_invalid_email":"Geben Sie eine gültige E-Mail-Adresse ein.","error_invalid_user":"Ungültiger Benutzerwert oder Rolle.","error_invalid_permission":"Ungültige Berechtigungseinstellung.","error_protected_admin":"Der aktuelle oder letzte aktive Administrator kann nicht deaktiviert oder gelöscht werden.","error_not_found":"Der angeforderte Datensatz wurde nicht gefunden.","error_server":"Ein unerwarteter Serverfehler ist aufgetreten."}'::jsonb)
  ) as seed(language_code,payload)
  loop
    insert into public.translation_keys(key) select item.key from jsonb_object_keys(language_row.payload) as item(key) on conflict(key) do nothing;
    insert into public.translation_values(language_code,key,value)
    select language_row.language_code,item.key,item.value from jsonb_each_text(language_row.payload) item
    on conflict(language_code,key) do update set value=excluded.value;
  end loop;
end
$ui_seed$;
