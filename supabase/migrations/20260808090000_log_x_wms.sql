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
create or replace function private.audit_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare old_data jsonb := case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
declare new_data jsonb := case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
declare item text; actor uuid := (select auth.uid()); actor_label text; operation_name text;
declare record_data jsonb;
begin
  select p.display_name into actor_label from public.profiles p where p.id=actor;
  operation_name := case tg_op when 'INSERT' then 'create' when 'DELETE' then 'remove' else case when tg_table_name like '%permission%' then 'permission_change' else 'update' end end;
  record_data := jsonb_strip_nulls(jsonb_build_object('id',coalesce(new_data->'id',old_data->'id'),'user_id',coalesce(new_data->'user_id',old_data->'user_id'),'resource_key',coalesce(new_data->'resource_key',old_data->'resource_key'),'code',coalesce(new_data->'code',old_data->'code'),'key',coalesce(new_data->'key',old_data->'key'),'language_code',coalesce(new_data->'language_code',old_data->'language_code')));
  for item in select key from (select jsonb_object_keys(old_data) key union select jsonb_object_keys(new_data) key) keys where key not in ('created_at','updated_at') loop
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
  select target_user,'test_entities',field,case
    when target_role='admin' then 'write'::public.access_level
    when target_role='editor' and field in ('name','owner','status') then 'write'::public.access_level
    when target_role='viewer' and field='risk' then 'deny'::public.access_level else 'read'::public.access_level end
  from unnest(array['code','name','owner','status','risk']) field on conflict do nothing;
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
  select case when (select auth.uid()) is not null and private.table_access((select auth.uid()),'permissions')>='read' then jsonb_build_object('tables',(select jsonb_agg(to_jsonb(p)) from public.user_table_permissions p),'fields',(select jsonb_agg(to_jsonb(f)) from public.user_field_permissions f)) else null end
$$;
create or replace function public.write_user_permission(target_user uuid,target_resource text,target_field text,next_access public.access_level)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.table_access((select auth.uid()),'permissions')<>'write' then raise exception 'access denied'; end if;
  if target_user=(select auth.uid()) and target_resource='permissions' and target_field is null and next_access<>'write' then raise exception 'cannot remove own permission access'; end if;
  if target_field is null then insert into public.user_table_permissions(user_id,resource_key,access) values(target_user,target_resource,next_access) on conflict(user_id,resource_key) do update set access=excluded.access;
  else insert into public.user_field_permissions(user_id,resource_key,field_name,access) values(target_user,target_resource,target_field,next_access) on conflict(user_id,resource_key,field_name) do update set access=excluded.access; end if;
end $$;
create or replace function public.read_audit_log(result_limit integer default 200)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',a.id,'actorId',a.actor_id,'actor',a.actor_name,'table',a.table_name,'record',a.record_key,'action',a.operation,'field',a.field_name,'before',a.old_value,'after',a.new_value,'when',a.occurred_at)
  from public.audit_log a where (select auth.uid()) is not null and private.table_access((select auth.uid()),'audit_log')>='read' order by a.occurred_at desc,a.id desc limit least(greatest(result_limit,1),500)
$$;

alter table public.profiles enable row level security;
alter table public.user_table_permissions enable row level security;
alter table public.user_field_permissions enable row level security;
alter table public.test_entities enable row level security;
alter table public.audit_log enable row level security;
alter table public.languages enable row level security;
alter table public.translation_keys enable row level security;
alter table public.translation_values enable row level security;
create policy languages_read on public.languages for select to anon,authenticated using (true);
create policy translation_keys_read on public.translation_keys for select to anon,authenticated using (true);
create policy translation_values_read on public.translation_values for select to anon,authenticated using (true);

revoke all on public.profiles,public.user_table_permissions,public.user_field_permissions,public.test_entities,public.audit_log from anon,authenticated;
grant select on public.languages,public.translation_keys,public.translation_values to anon,authenticated;
grant all on public.profiles,public.user_table_permissions,public.user_field_permissions,public.test_entities,public.audit_log,public.languages,public.translation_keys,public.translation_values to service_role;
revoke execute on all functions in schema private from public,anon,authenticated,service_role;
revoke execute on function public.read_test_entities(),public.write_test_entity(uuid,jsonb),public.delete_test_entity(uuid),public.read_permission_matrix(),public.write_user_permission(uuid,text,text,public.access_level),public.read_audit_log(integer) from public,anon;
grant execute on function public.read_test_entities(),public.write_test_entity(uuid,jsonb),public.delete_test_entity(uuid),public.read_permission_matrix(),public.write_user_permission(uuid,text,text,public.access_level),public.read_audit_log(integer) to authenticated;

insert into public.languages(code,name) values ('hu','Magyar'),('en','English'),('de','Deutsch');
insert into public.translation_keys(key) values ('app_title'),('app_subtitle'),('nav_entities'),('nav_users'),('nav_permissions'),('nav_audit'),('nav_languages'),('new'),('edit'),('delete'),('save'),('cancel'),('code'),('name'),('owner'),('status'),('risk'),('active'),('inactive'),('draft'),('low'),('medium'),('high'),('access'),('role'),('email'),('table_access'),('column_access'),('read'),('write'),('deny'),('actor'),('table'),('record'),('action'),('field'),('before'),('after'),('when'),('add_language'),('language_code'),('language_name'),('translation_key'),('translation_value'),('add_user'),('edit_user'),('no_access'),('demo_user'),('confirm_delete'),('confirm_delete_user'),('actions'),('empty'),('close'),('language'),('audit_hint'),('permission_hint'),('saved'),('deleted'),('admin_only'),('visible'),('modifiable'),('scope');
insert into public.translation_values(language_code,key,value) values ('hu','app_title','LOG-X WMS'),('en','app_title','LOG-X WMS'),('de','app_title','LOG-X WMS'),('hu','app_subtitle','Adatvezérelt validációs környezet'),('en','app_subtitle','Data-driven validation environment'),('de','app_subtitle','Datengesteuerte Validierungsumgebung');
