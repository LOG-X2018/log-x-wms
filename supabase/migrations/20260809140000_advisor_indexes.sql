-- LOG-X WMS: covering indexes for every composite dictionary foreign key.
-- Generated dictionary-key columns intentionally come first to match the FK order.

create index inventory_items_unit_dictionary_fk_idx
  on public.inventory_items(unit_dictionary_key, unit_code);
create index inventory_items_status_dictionary_fk_idx
  on public.inventory_items(status_dictionary_key, status_code);
create index warehouse_locations_type_dictionary_fk_idx
  on public.warehouse_locations(location_type_dictionary_key, location_type_code);
create index stock_movements_type_dictionary_fk_idx
  on public.stock_movements(movement_type_dictionary_key, movement_type_code);
create index inbound_receipts_status_dictionary_fk_idx
  on public.inbound_receipts(status_dictionary_key, status_code);
create index outbound_orders_status_dictionary_fk_idx
  on public.outbound_orders(status_dictionary_key, status_code);
create index outbound_orders_priority_dictionary_fk_idx
  on public.outbound_orders(priority_dictionary_key, priority_code);
