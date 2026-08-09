-- LOG-X WMS: complete PL/pgSQL variable qualification for runtime dictionary synchronization.

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
