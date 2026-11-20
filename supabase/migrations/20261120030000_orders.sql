-- Persist customer orders for each restaurant tenant.
-- Order writes are performed by the server API using the service-role key.
-- Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  order_number text not null,
  customer_name text not null check (length(trim(customer_name)) between 1 and 120),
  customer_contact text not null check (length(trim(customer_contact)) between 1 and 120),
  order_type text not null check (order_type in ('sur_place', 'takeaway')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  currency text not null default 'DZD',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total numeric(12,2) not null check (total >= 0),
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, order_number),
  unique (id, restaurant_id)
);

create index orders_restaurant_created_idx
  on public.orders(restaurant_id, created_at desc);
create index orders_restaurant_status_created_idx
  on public.orders(restaurant_id, status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  restaurant_id uuid not null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name jsonb not null,
  quantity integer not null check (quantity between 1 and 50),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  selected_extras jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selected_extras) = 'array'),
  line_total numeric(12,2) not null check (line_total >= 0),
  note text,
  created_at timestamptz not null default now(),
  foreign key (order_id, restaurant_id)
    references public.orders(id, restaurant_id) on delete cascade
);

create index order_items_order_idx on public.order_items(order_id);
create index order_items_restaurant_idx on public.order_items(restaurant_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (status, updated_at) on public.orders to authenticated;

create policy orders_manager_read
  on public.orders for select to authenticated
  using ((select private.can_access_restaurant(restaurant_id)));

create policy orders_manager_update
  on public.orders for update to authenticated
  using ((select private.can_manage_restaurant(restaurant_id)))
  with check ((select private.can_manage_restaurant(restaurant_id)));

create policy order_items_manager_read
  on public.order_items for select to authenticated
  using ((select private.can_access_restaurant(restaurant_id)));

create trigger orders_set_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();
