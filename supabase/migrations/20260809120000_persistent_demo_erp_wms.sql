-- LOG-X WMS: persistent Node state adapter plus normalized ERP/WMS demo model.
--
-- Runtime compatibility:
--   * private.log_x_wms_state is the production server state document and is
--     reachable only by service_role through explicitly granted RPC functions.
--   * public.log_x_wms_demo_state is an intentionally public, non-sensitive
--     demo document. Its tightly scoped RPCs can be called with a publishable
--     key. Anyone can modify that one demo document, so it is not authentication.
--   * The normalized ERP/WMS tables are the forward model for replacing the
--     compatibility state document module by module.

alter table public.profiles
  add column accent_color text not null default '#64748B',
  add constraint profiles_accent_color_rgb_hex_check
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

create table private.log_x_wms_state (
  singleton boolean primary key default true check (singleton),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table private.log_x_wms_state enable row level security;

create table public.log_x_wms_demo_state (
  state_key text primary key default 'public_demo' check (state_key = 'public_demo'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table public.log_x_wms_demo_state enable row level security;

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (btrim(sku) <> ''),
  name text not null check (btrim(name) <> ''),
  unit_code text not null default 'pcs',
  unit_dictionary_key text generated always as ('unit_of_measure') stored,
  status_code text not null default 'active',
  status_dictionary_key text generated always as ('item_status') stored,
  on_hand numeric(14,3) not null default 0 check (on_hand >= 0),
  reorder_point numeric(14,3) not null default 0 check (reorder_point >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (unit_dictionary_key, unit_code)
    references public.dictionary_options(dictionary_key, option_code),
  foreign key (status_dictionary_key, status_code)
    references public.dictionary_options(dictionary_key, option_code)
);

create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  location_type_code text not null default 'storage',
  location_type_dictionary_key text generated always as ('warehouse_location_type') stored,
  capacity numeric(14,3) check (capacity is null or capacity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (location_type_dictionary_key, location_type_code)
    references public.dictionary_options(dictionary_key, option_code)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  movement_type_code text not null,
  movement_type_dictionary_key text generated always as ('stock_movement_type') stored,
  quantity numeric(14,3) not null check (quantity > 0),
  reference text not null check (btrim(reference) <> ''),
  note text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (movement_type_dictionary_key, movement_type_code)
    references public.dictionary_options(dictionary_key, option_code)
);

create table public.inbound_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique check (btrim(receipt_no) <> ''),
  supplier text not null check (btrim(supplier) <> ''),
  status_code text not null default 'planned',
  status_dictionary_key text generated always as ('inbound_status') stored,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  received_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (status_dictionary_key, status_code)
    references public.dictionary_options(dictionary_key, option_code)
);

create table public.outbound_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique check (btrim(order_no) <> ''),
  customer text not null check (btrim(customer) <> ''),
  status_code text not null default 'new',
  status_dictionary_key text generated always as ('outbound_status') stored,
  priority_code text not null default 'normal',
  priority_dictionary_key text generated always as ('order_priority') stored,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  location_id uuid not null references public.warehouse_locations(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  ship_by timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (status_dictionary_key, status_code)
    references public.dictionary_options(dictionary_key, option_code),
  foreign key (priority_dictionary_key, priority_code)
    references public.dictionary_options(dictionary_key, option_code)
);

create index inventory_items_status_idx
  on public.inventory_items(status_code, sku);
create index inventory_items_reorder_idx
  on public.inventory_items(on_hand, reorder_point)
  where status_code = 'active';
create index warehouse_locations_type_idx
  on public.warehouse_locations(location_type_code, active);
create index stock_movements_item_occurred_idx
  on public.stock_movements(item_id, occurred_at desc);
create index stock_movements_location_occurred_idx
  on public.stock_movements(location_id, occurred_at desc);
create index inbound_receipts_status_idx
  on public.inbound_receipts(status_code, updated_at desc);
create index inbound_receipts_item_idx
  on public.inbound_receipts(item_id);
create index inbound_receipts_location_idx
  on public.inbound_receipts(location_id);
create index outbound_orders_status_ship_idx
  on public.outbound_orders(status_code, ship_by);
create index outbound_orders_item_idx
  on public.outbound_orders(item_id);
create index outbound_orders_location_idx
  on public.outbound_orders(location_id);

alter table public.inventory_items enable row level security;
alter table public.warehouse_locations enable row level security;
alter table public.stock_movements enable row level security;
alter table public.inbound_receipts enable row level security;
alter table public.outbound_orders enable row level security;

-- Explicit grants are required for new Supabase projects. The normalized
-- business tables remain server-only until user-JWT RPCs are introduced.
revoke all on table
  private.log_x_wms_state,
  public.log_x_wms_demo_state,
  public.inventory_items,
  public.warehouse_locations,
  public.stock_movements,
  public.inbound_receipts,
  public.outbound_orders
from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on table private.log_x_wms_state to service_role;
grant all on table
  public.log_x_wms_demo_state,
  public.inventory_items,
  public.warehouse_locations,
  public.stock_movements,
  public.inbound_receipts,
  public.outbound_orders
to service_role;

create or replace function public.log_x_wms_read_state()
returns table(state jsonb, revision bigint, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select stored.state, stored.revision, stored.updated_at
  from private.log_x_wms_state stored
  where stored.singleton
$$;

create or replace function public.log_x_wms_write_state(
  payload jsonb,
  expected_revision bigint default null
)
returns table(state jsonb, revision bigint, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare
  current_revision bigint;
  state_exists boolean;
  saved_state jsonb;
  saved_revision bigint;
  saved_updated_at timestamptz;
begin
  if payload is null or jsonb_typeof(payload) <> 'object'
    or pg_catalog.octet_length(payload::text) > 16777216 then
    raise exception 'invalid application state';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(7800595101::bigint);
  select stored.revision into current_revision
  from private.log_x_wms_state stored
  where stored.singleton
  for update;
  state_exists := found;
  if state_exists then
    if expected_revision is not null and expected_revision <> current_revision then
      raise exception using errcode = '40001', message = 'state revision conflict';
    end if;
    update private.log_x_wms_state stored
    set state = payload,
        revision = stored.revision + 1,
        updated_at = now()
    where stored.singleton
    returning stored.state, stored.revision, stored.updated_at
      into saved_state, saved_revision, saved_updated_at;
  else
    if expected_revision is not null and expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'state revision conflict';
    end if;
    insert into private.log_x_wms_state(singleton, state, revision)
    values (true, payload, 1)
    returning log_x_wms_state.state, log_x_wms_state.revision, log_x_wms_state.updated_at
      into saved_state, saved_revision, saved_updated_at;
  end if;
  state := saved_state;
  revision := saved_revision;
  updated_at := saved_updated_at;
  return next;
end $$;

-- Public-demo RPCs are intentionally limited to exactly one non-sensitive row.
-- SECURITY DEFINER is required because callers have no direct table privileges.
-- Execute is revoked from PUBLIC below and granted only to API roles explicitly.
create or replace function public.log_x_wms_read_demo_state()
returns table(state jsonb, revision bigint, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select stored.state, stored.revision, stored.updated_at
  from public.log_x_wms_demo_state stored
  where stored.state_key = 'public_demo'
$$;

create or replace function public.log_x_wms_write_demo_state(
  payload jsonb,
  expected_revision bigint default null
)
returns table(state jsonb, revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  current_revision bigint;
  state_exists boolean;
  saved_state jsonb;
  saved_revision bigint;
  saved_updated_at timestamptz;
begin
  if payload is null or jsonb_typeof(payload) <> 'object'
    or pg_catalog.octet_length(payload::text) > 4194304 then
    raise exception 'invalid public demo state';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(7800595102::bigint);
  select stored.revision into current_revision
  from public.log_x_wms_demo_state stored
  where stored.state_key = 'public_demo'
  for update;
  state_exists := found;
  if state_exists then
    if expected_revision is not null and expected_revision <> current_revision then
      raise exception using errcode = '40001', message = 'state revision conflict';
    end if;
    update public.log_x_wms_demo_state stored
    set state = payload,
        revision = stored.revision + 1,
        updated_at = now()
    where stored.state_key = 'public_demo'
    returning stored.state, stored.revision, stored.updated_at
      into saved_state, saved_revision, saved_updated_at;
  else
    if expected_revision is not null and expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'state revision conflict';
    end if;
    insert into public.log_x_wms_demo_state(state_key, state, revision)
    values ('public_demo', payload, 1)
    returning log_x_wms_demo_state.state, log_x_wms_demo_state.revision, log_x_wms_demo_state.updated_at
      into saved_state, saved_revision, saved_updated_at;
  end if;
  state := saved_state;
  revision := saved_revision;
  updated_at := saved_updated_at;
  return next;
end $$;

revoke execute on function
  public.log_x_wms_read_state(),
  public.log_x_wms_write_state(jsonb, bigint),
  public.log_x_wms_read_demo_state(),
  public.log_x_wms_write_demo_state(jsonb, bigint)
from public, anon, authenticated, service_role;
grant execute on function
  public.log_x_wms_read_state(),
  public.log_x_wms_write_state(jsonb, bigint)
to service_role;
grant execute on function
  public.log_x_wms_read_demo_state(),
  public.log_x_wms_write_demo_state(jsonb, bigint)
to anon, authenticated, service_role;

insert into public.option_dictionaries(key, english_name) values
  ('unit_of_measure', 'Unit of measure'),
  ('item_status', 'Item status'),
  ('stock_movement_type', 'Stock movement type'),
  ('warehouse_location_type', 'Warehouse location type'),
  ('inbound_status', 'Inbound receipt status'),
  ('outbound_status', 'Outbound order status'),
  ('order_priority', 'Order priority')
on conflict (key) do update set english_name = excluded.english_name, enabled = true;

insert into public.dictionary_options(
  dictionary_key, option_code, translation_key, english_name, sort_order
) values
  ('unit_of_measure', 'pcs', 'option.unit_of_measure.pcs', 'Pieces', 10),
  ('unit_of_measure', 'kg', 'option.unit_of_measure.kg', 'Kilograms', 20),
  ('unit_of_measure', 'pallet', 'option.unit_of_measure.pallet', 'Pallets', 30),
  ('item_status', 'active', 'option.item_status.active', 'Active', 10),
  ('item_status', 'blocked', 'option.item_status.blocked', 'Blocked', 20),
  ('item_status', 'discontinued', 'option.item_status.discontinued', 'Discontinued', 30),
  ('stock_movement_type', 'receipt', 'option.stock_movement_type.receipt', 'Receipt', 10),
  ('stock_movement_type', 'issue', 'option.stock_movement_type.issue', 'Issue', 20),
  ('stock_movement_type', 'adjustment_in', 'option.stock_movement_type.adjustment_in', 'Positive adjustment', 30),
  ('stock_movement_type', 'adjustment_out', 'option.stock_movement_type.adjustment_out', 'Negative adjustment', 40),
  ('warehouse_location_type', 'receiving', 'option.warehouse_location_type.receiving', 'Receiving', 10),
  ('warehouse_location_type', 'storage', 'option.warehouse_location_type.storage', 'Storage', 20),
  ('warehouse_location_type', 'picking', 'option.warehouse_location_type.picking', 'Picking', 30),
  ('warehouse_location_type', 'shipping', 'option.warehouse_location_type.shipping', 'Shipping', 40),
  ('inbound_status', 'planned', 'option.inbound_status.planned', 'Planned', 10),
  ('inbound_status', 'in_progress', 'option.inbound_status.in_progress', 'In progress', 20),
  ('inbound_status', 'received', 'option.inbound_status.received', 'Received', 30),
  ('inbound_status', 'cancelled', 'option.inbound_status.cancelled', 'Cancelled', 40),
  ('outbound_status', 'new', 'option.outbound_status.new', 'New', 10),
  ('outbound_status', 'picking', 'option.outbound_status.picking', 'Picking', 20),
  ('outbound_status', 'packed', 'option.outbound_status.packed', 'Packed', 30),
  ('outbound_status', 'shipped', 'option.outbound_status.shipped', 'Shipped', 40),
  ('outbound_status', 'cancelled', 'option.outbound_status.cancelled', 'Cancelled', 50),
  ('order_priority', 'low', 'option.order_priority.low', 'Low', 10),
  ('order_priority', 'normal', 'option.order_priority.normal', 'Normal', 20),
  ('order_priority', 'high', 'option.order_priority.high', 'High', 30)
on conflict (dictionary_key, option_code) do update
set translation_key = excluded.translation_key,
    english_name = excluded.english_name,
    sort_order = excluded.sort_order,
    enabled = true;

insert into public.dictionary_option_labels(
  dictionary_key, option_code, language_code, label
) values
  ('unit_of_measure','pcs','en','Pieces'),('unit_of_measure','pcs','hu','Darab'),('unit_of_measure','pcs','de','Stück'),
  ('unit_of_measure','kg','en','Kilograms'),('unit_of_measure','kg','hu','Kilogramm'),('unit_of_measure','kg','de','Kilogramm'),
  ('unit_of_measure','pallet','en','Pallets'),('unit_of_measure','pallet','hu','Raklap'),('unit_of_measure','pallet','de','Paletten'),
  ('item_status','active','en','Active'),('item_status','active','hu','Aktív'),('item_status','active','de','Aktiv'),
  ('item_status','blocked','en','Blocked'),('item_status','blocked','hu','Zárolt'),('item_status','blocked','de','Gesperrt'),
  ('item_status','discontinued','en','Discontinued'),('item_status','discontinued','hu','Kivezetett'),('item_status','discontinued','de','Eingestellt'),
  ('stock_movement_type','receipt','en','Receipt'),('stock_movement_type','receipt','hu','Bevételezés'),('stock_movement_type','receipt','de','Wareneingang'),
  ('stock_movement_type','issue','en','Issue'),('stock_movement_type','issue','hu','Kiadás'),('stock_movement_type','issue','de','Ausgabe'),
  ('stock_movement_type','adjustment_in','en','Positive adjustment'),('stock_movement_type','adjustment_in','hu','Pozitív korrekció'),('stock_movement_type','adjustment_in','de','Positive Korrektur'),
  ('stock_movement_type','adjustment_out','en','Negative adjustment'),('stock_movement_type','adjustment_out','hu','Negatív korrekció'),('stock_movement_type','adjustment_out','de','Negative Korrektur'),
  ('warehouse_location_type','receiving','en','Receiving'),('warehouse_location_type','receiving','hu','Átvétel'),('warehouse_location_type','receiving','de','Wareneingang'),
  ('warehouse_location_type','storage','en','Storage'),('warehouse_location_type','storage','hu','Tárolás'),('warehouse_location_type','storage','de','Lagerung'),
  ('warehouse_location_type','picking','en','Picking'),('warehouse_location_type','picking','hu','Komissiózás'),('warehouse_location_type','picking','de','Kommissionierung'),
  ('warehouse_location_type','shipping','en','Shipping'),('warehouse_location_type','shipping','hu','Kiszállítás'),('warehouse_location_type','shipping','de','Versand'),
  ('inbound_status','planned','en','Planned'),('inbound_status','planned','hu','Tervezett'),('inbound_status','planned','de','Geplant'),
  ('inbound_status','in_progress','en','In progress'),('inbound_status','in_progress','hu','Folyamatban'),('inbound_status','in_progress','de','In Bearbeitung'),
  ('inbound_status','received','en','Received'),('inbound_status','received','hu','Bevételezve'),('inbound_status','received','de','Eingegangen'),
  ('inbound_status','cancelled','en','Cancelled'),('inbound_status','cancelled','hu','Törölt'),('inbound_status','cancelled','de','Storniert'),
  ('outbound_status','new','en','New'),('outbound_status','new','hu','Új'),('outbound_status','new','de','Neu'),
  ('outbound_status','picking','en','Picking'),('outbound_status','picking','hu','Komissiózás'),('outbound_status','picking','de','Kommissionierung'),
  ('outbound_status','packed','en','Packed'),('outbound_status','packed','hu','Csomagolva'),('outbound_status','packed','de','Verpackt'),
  ('outbound_status','shipped','en','Shipped'),('outbound_status','shipped','hu','Kiszállítva'),('outbound_status','shipped','de','Versandt'),
  ('outbound_status','cancelled','en','Cancelled'),('outbound_status','cancelled','hu','Törölt'),('outbound_status','cancelled','de','Storniert'),
  ('order_priority','low','en','Low'),('order_priority','low','hu','Alacsony'),('order_priority','low','de','Niedrig'),
  ('order_priority','normal','en','Normal'),('order_priority','normal','hu','Normál'),('order_priority','normal','de','Normal'),
  ('order_priority','high','en','High'),('order_priority','high','hu','Magas'),('order_priority','high','de','Hoch')
on conflict (dictionary_key, option_code, language_code) do update
set label = excluded.label;

create trigger audit_inventory_items
after insert or update or delete on public.inventory_items
for each row execute function private.audit_changes();
create trigger audit_warehouse_locations
after insert or update or delete on public.warehouse_locations
for each row execute function private.audit_changes();
create trigger audit_stock_movements
after insert or update or delete on public.stock_movements
for each row execute function private.audit_changes();
create trigger audit_inbound_receipts
after insert or update or delete on public.inbound_receipts
for each row execute function private.audit_changes();
create trigger audit_outbound_orders
after insert or update or delete on public.outbound_orders
for each row execute function private.audit_changes();

create or replace function private.permission_resources()
returns table(resource_key text)
language sql immutable security invoker set search_path = '' as $$
  values
    ('test_entities'::text),
    ('inventory_items'::text),
    ('warehouse_locations'::text),
    ('stock_movements'::text),
    ('inbound_receipts'::text),
    ('outbound_orders'::text),
    ('users'::text),
    ('permissions'::text),
    ('audit_log'::text),
    ('translations'::text)
$$;

create or replace function private.permission_fields()
returns table(resource_key text, field_name text)
language sql immutable security invoker set search_path = '' as $$
  values
    ('test_entities'::text,'code'::text),
    ('test_entities'::text,'name'::text),
    ('test_entities'::text,'owner'::text),
    ('test_entities'::text,'status'::text),
    ('test_entities'::text,'risk'::text),
    ('inventory_items'::text,'sku'::text),
    ('inventory_items'::text,'name'::text),
    ('inventory_items'::text,'unit'::text),
    ('inventory_items'::text,'status'::text),
    ('inventory_items'::text,'onHand'::text),
    ('inventory_items'::text,'reorderPoint'::text),
    ('warehouse_locations'::text,'code'::text),
    ('warehouse_locations'::text,'name'::text),
    ('warehouse_locations'::text,'type'::text),
    ('warehouse_locations'::text,'capacity'::text),
    ('warehouse_locations'::text,'active'::text),
    ('stock_movements'::text,'itemId'::text),
    ('stock_movements'::text,'locationId'::text),
    ('stock_movements'::text,'type'::text),
    ('stock_movements'::text,'quantity'::text),
    ('stock_movements'::text,'reference'::text),
    ('stock_movements'::text,'note'::text),
    ('stock_movements'::text,'occurredAt'::text),
    ('inbound_receipts'::text,'receiptNo'::text),
    ('inbound_receipts'::text,'supplier'::text),
    ('inbound_receipts'::text,'status'::text),
    ('inbound_receipts'::text,'itemId'::text),
    ('inbound_receipts'::text,'locationId'::text),
    ('inbound_receipts'::text,'quantity'::text),
    ('inbound_receipts'::text,'receivedAt'::text),
    ('inbound_receipts'::text,'note'::text),
    ('outbound_orders'::text,'orderNo'::text),
    ('outbound_orders'::text,'customer'::text),
    ('outbound_orders'::text,'status'::text),
    ('outbound_orders'::text,'priority'::text),
    ('outbound_orders'::text,'itemId'::text),
    ('outbound_orders'::text,'locationId'::text),
    ('outbound_orders'::text,'quantity'::text),
    ('outbound_orders'::text,'shipBy'::text),
    ('outbound_orders'::text,'note'::text),
    ('users'::text,'name'::text),
    ('users'::text,'email'::text),
    ('users'::text,'role'::text),
    ('users'::text,'active'::text),
    ('users'::text,'highlightColor'::text),
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

create or replace function private.seed_user_permissions(
  target_user uuid,
  target_role public.app_role
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_table_permissions(user_id, resource_key, access)
  select target_user, resource.resource_key, case
    when resource.resource_key = 'test_entities' and target_role = 'viewer' then 'read'::public.access_level
    when resource.resource_key = 'test_entities' then 'write'::public.access_level
    when resource.resource_key in ('inventory_items','warehouse_locations','stock_movements','inbound_receipts','outbound_orders')
      and target_role = 'viewer' then 'read'::public.access_level
    when resource.resource_key in ('inventory_items','warehouse_locations','stock_movements','inbound_receipts','outbound_orders')
      then 'write'::public.access_level
    when resource.resource_key = 'users' and target_role = 'admin' then 'write'::public.access_level
    when resource.resource_key = 'users' and target_role = 'editor' then 'read'::public.access_level
    when resource.resource_key = 'permissions' and target_role = 'admin' then 'write'::public.access_level
    when resource.resource_key = 'audit_log' and target_role in ('admin','editor') then 'read'::public.access_level
    when resource.resource_key = 'translations' and target_role = 'admin' then 'write'::public.access_level
    else 'deny'::public.access_level end
  from private.permission_resources() resource
  on conflict (user_id, resource_key) do nothing;

  insert into public.user_field_permissions(user_id, resource_key, field_name, access)
  select target_user, field.resource_key, field.field_name, case
    when field.resource_key = 'test_entities' and target_role = 'admin' then 'write'::public.access_level
    when field.resource_key = 'test_entities' and target_role = 'editor'
      and field.field_name in ('name','owner','status') then 'write'::public.access_level
    when field.resource_key = 'test_entities' and target_role = 'viewer'
      and field.field_name = 'risk' then 'deny'::public.access_level
    when field.resource_key = 'test_entities' then 'read'::public.access_level
    when field.resource_key in ('inventory_items','warehouse_locations','stock_movements','inbound_receipts','outbound_orders')
      and target_role = 'viewer' then 'read'::public.access_level
    when field.resource_key in ('inventory_items','warehouse_locations','stock_movements','inbound_receipts','outbound_orders')
      then 'write'::public.access_level
    when field.resource_key = 'users' and target_role = 'admin' then 'write'::public.access_level
    when field.resource_key = 'users' and target_role = 'editor' then 'read'::public.access_level
    when field.resource_key = 'audit_log' and target_role in ('admin','editor') then 'read'::public.access_level
    when field.resource_key = 'translations' and target_role = 'admin' then 'write'::public.access_level
    else 'deny'::public.access_level end
  from private.permission_fields() field
  on conflict (user_id, resource_key, field_name) do nothing;
end $$;

create or replace function private.filtered_profile(
  target_profile public.profiles,
  target_viewer uuid
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',(target_profile).id)
    || case when private.field_access(target_viewer,'users','name') >= 'read' then jsonb_build_object('name',(target_profile).display_name) else '{}'::jsonb end
    || case when private.field_access(target_viewer,'users','role') >= 'read' then jsonb_build_object('role',(target_profile).role) else '{}'::jsonb end
    || case when private.field_access(target_viewer,'users','active') >= 'read' then jsonb_build_object('active',(target_profile).active) else '{}'::jsonb end
    || case when private.field_access(target_viewer,'users','highlightColor') >= 'read' then jsonb_build_object('highlightColor',(target_profile).accent_color) else '{}'::jsonb end
$$;

create or replace function public.write_profile_accent(
  target_user uuid,
  target_color text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  result public.profiles;
  normalized_color text := upper(btrim(target_color));
begin
  if caller_id is null
    or not private.is_active_admin(caller_id)
    or private.table_access(caller_id,'users') <> 'write'
    or private.field_access(caller_id,'users','highlightColor') <> 'write' then
    raise exception 'access denied';
  end if;
  if normalized_color !~ '^#[0-9A-F]{6}$' then
    raise exception 'invalid highlight color';
  end if;
  update public.profiles
  set accent_color = normalized_color, updated_at = now()
  where id = target_user
  returning * into result;
  if not found then raise exception 'profile not found'; end if;
  return private.filtered_profile(result, caller_id);
end $$;

revoke execute on function public.write_profile_accent(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.write_profile_accent(uuid, text)
to authenticated, service_role;

-- Add only missing defaults for existing profiles; customized permissions win.
do $seed_existing_permissions$
declare profile_row record;
begin
  for profile_row in select profile.id, profile.role from public.profiles profile loop
    perform private.seed_user_permissions(profile_row.id, profile_row.role);
  end loop;
end
$seed_existing_permissions$;

comment on table public.log_x_wms_demo_state is
  'Public, non-sensitive LOG-X WMS demo state. Any caller with the publishable key can modify it through the scoped RPC.';
comment on function public.log_x_wms_write_demo_state(jsonb, bigint) is
  'Public demo persistence only; this is intentionally not authentication and must never contain sensitive data.';
comment on table private.log_x_wms_state is
  'Server-only LOG-X WMS compatibility state used by the service-role adapter.';
