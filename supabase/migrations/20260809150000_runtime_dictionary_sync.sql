-- LOG-X WMS: make normalized dictionary tables the runtime source of dropdowns.
-- The compatibility JSONB state keeps a copy for portable local development,
-- but Supabase reads replace that copy from dictionary tables on every request.

create or replace function private.log_x_wms_sync_runtime_dictionaries(payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  language_row jsonb;
  dictionary_row record;
  option_row jsonb;
  label_row record;
  target_language_code text;
  target_dictionary_key text;
  target_option_code text;
  target_translation_key text;
  option_index integer;
begin
  if jsonb_typeof(payload) <> 'object' then
    raise exception 'invalid application state';
  end if;

  if jsonb_typeof(payload->'languages') = 'array' then
    for language_row in select value from jsonb_array_elements(payload->'languages') loop
      target_language_code := lower(btrim(language_row->>'code'));
      if target_language_code !~ '^[a-z]{2,8}$' or btrim(coalesce(language_row->>'name','')) = '' then
        raise exception 'invalid runtime language';
      end if;
      insert into public.languages(code, name, enabled)
      values (
        target_language_code,
        btrim(language_row->>'name'),
        case when jsonb_typeof(language_row->'enabled') = 'boolean'
          then (language_row->>'enabled')::boolean else true end
      )
      on conflict (code) do update
      set name = excluded.name, enabled = excluded.enabled;
    end loop;
  end if;

  if jsonb_typeof(payload->'dictionaries') <> 'object' then
    return;
  end if;

  for dictionary_row in select key, value from jsonb_each(payload->'dictionaries') loop
    target_dictionary_key := dictionary_row.key;
    if target_dictionary_key !~ '^[a-z][a-z0-9_]*$'
      or btrim(coalesce(dictionary_row.value->>'englishName','')) = '' then
      raise exception 'invalid runtime dictionary';
    end if;

    insert into public.option_dictionaries(key, english_name, enabled)
    values (target_dictionary_key, btrim(dictionary_row.value->>'englishName'), true)
    on conflict (key) do update
    set english_name = excluded.english_name, enabled = true;

    if jsonb_typeof(dictionary_row.value->'options') <> 'array' then
      continue;
    end if;

    option_index := 0;
    for option_row in select value from jsonb_array_elements(dictionary_row.value->'options') loop
      option_index := option_index + 1;
      target_option_code := option_row->>'code';
      target_translation_key := option_row->>'key';
      if target_option_code !~ '^[a-z][a-z0-9_]*$'
        or target_translation_key !~ '^option\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
        or btrim(coalesce(option_row->>'englishName','')) = '' then
        raise exception 'invalid runtime dictionary option';
      end if;

      insert into public.dictionary_options(
        dictionary_key, option_code, translation_key, english_name, sort_order, enabled
      ) values (
        target_dictionary_key, target_option_code, target_translation_key,
        btrim(option_row->>'englishName'), option_index * 10, true
      )
      on conflict (dictionary_key, option_code) do update
      set translation_key = excluded.translation_key,
          english_name = excluded.english_name,
          sort_order = excluded.sort_order,
          enabled = true;

      if jsonb_typeof(option_row->'labels') = 'object' then
        for label_row in select key, value from jsonb_each_text(option_row->'labels') loop
          target_language_code := lower(btrim(label_row.key));
          if exists(select 1 from public.languages language where language.code = target_language_code)
            and btrim(label_row.value) <> '' then
            insert into public.dictionary_option_labels(
              dictionary_key, option_code, language_code, label
            ) values (
              target_dictionary_key, target_option_code, target_language_code, btrim(label_row.value)
            )
            on conflict (dictionary_key, option_code, language_code) do update
            set label = excluded.label;
          end if;
        end loop;
      end if;
    end loop;
  end loop;
end
$$;

create or replace function private.log_x_wms_sync_runtime_dictionaries_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_x_wms_sync_runtime_dictionaries(new.state);
  return new;
end
$$;

create trigger sync_private_runtime_dictionaries
before insert or update of state on private.log_x_wms_state
for each row execute function private.log_x_wms_sync_runtime_dictionaries_trigger();

create trigger sync_public_demo_runtime_dictionaries
before insert or update of state on public.log_x_wms_demo_state
for each row execute function private.log_x_wms_sync_runtime_dictionaries_trigger();

create or replace function public.log_x_wms_read_state()
returns table(state jsonb, revision bigint, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select jsonb_set(stored.state, '{dictionaries}', public.read_dictionaries('en'), true),
         stored.revision,
         stored.updated_at
  from private.log_x_wms_state stored
  where stored.singleton
$$;

create or replace function public.log_x_wms_read_demo_state()
returns table(state jsonb, revision bigint, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select jsonb_set(stored.state, '{dictionaries}', public.read_dictionaries('en'), true),
         stored.revision,
         stored.updated_at
  from public.log_x_wms_demo_state stored
  where stored.state_key = 'public_demo'
$$;

revoke execute on function
  private.log_x_wms_sync_runtime_dictionaries(jsonb),
  private.log_x_wms_sync_runtime_dictionaries_trigger()
from public, anon, authenticated, service_role;

revoke execute on function public.log_x_wms_read_state()
from public, anon, authenticated, service_role;
grant execute on function public.log_x_wms_read_state() to service_role;

revoke execute on function public.log_x_wms_read_demo_state()
from public, anon, authenticated, service_role;
grant execute on function public.log_x_wms_read_demo_state()
to anon, authenticated, service_role;

comment on function private.log_x_wms_sync_runtime_dictionaries(jsonb) is
  'Synchronizes runtime dropdown metadata into normalized multilingual dictionary tables.';
