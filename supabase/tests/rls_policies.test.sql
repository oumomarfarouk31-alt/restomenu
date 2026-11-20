-- RestoMenu baseline schema and RLS regression tests.
-- Run locally with: supabase test db
-- These tests validate the foundation migration without changing production data.

begin;

select extensions.plan(31);

-- Required tenant tables.
select extensions.has_table('public', 'profiles', 'profiles table exists');
select extensions.has_table('public', 'restaurants', 'restaurants table exists');
select extensions.has_table('public', 'restaurant_members', 'restaurant_members table exists');
select extensions.has_table('public', 'menu_categories', 'menu_categories table exists');
select extensions.has_table('public', 'menu_items', 'menu_items table exists');

-- RLS must remain enabled on every exposed tenant table.
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.restaurants'::regclass),
  'RLS is enabled on restaurants'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.restaurant_members'::regclass),
  'RLS is enabled on restaurant_members'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.menu_categories'::regclass),
  'RLS is enabled on menu_categories'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.menu_items'::regclass),
  'RLS is enabled on menu_items'
);

-- Detect accidental removal or broadening of the baseline policy set.
select extensions.policies_are(
  'public', 'profiles',
  array['profiles_read_self_or_master', 'profiles_update_display_name'],
  'profiles has only its expected baseline policies'
);
select extensions.policies_are(
  'public', 'restaurants',
  array[
    'restaurants_public_read_active',
    'restaurants_authenticated_read',
    'restaurants_master_insert',
    'restaurants_master_or_manager_update',
    'restaurants_master_delete'
  ],
  'restaurants has only its expected baseline policies'
);
select extensions.policies_are(
  'public', 'restaurant_members',
  array[
    'restaurant_members_read_self_or_master',
    'restaurant_members_master_insert',
    'restaurant_members_master_update',
    'restaurant_members_master_delete'
  ],
  'restaurant_members has only its expected baseline policies'
);
select extensions.policies_are(
  'public', 'menu_categories',
  array[
    'menu_categories_public_read',
    'menu_categories_authenticated_read',
    'menu_categories_manager_insert',
    'menu_categories_manager_update',
    'menu_categories_manager_delete'
  ],
  'menu_categories has only its expected baseline policies'
);
select extensions.policies_are(
  'public', 'menu_items',
  array[
    'menu_items_public_read',
    'menu_items_authenticated_read',
    'menu_items_manager_insert',
    'menu_items_manager_update',
    'menu_items_manager_delete'
  ],
  'menu_items has only its expected baseline policies'
);

select extensions.has_table('public', 'orders', 'orders table exists');
select extensions.has_table('public', 'order_items', 'order_items table exists');
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  'RLS is enabled on orders'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.order_items'::regclass),
  'RLS is enabled on order_items'
);
select extensions.policies_are(
  'public', 'orders',
  array['orders_manager_read', 'orders_manager_update'],
  'orders has only manager read/update policies'
);
select extensions.policies_are(
  'public', 'order_items',
  array['order_items_manager_read'],
  'order_items has only manager read policies'
);

-- Privileges and helper-function execution boundaries.
select extensions.ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anonymous users cannot select profiles'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.restaurant_members', 'SELECT'),
  'anonymous users cannot select restaurant memberships'
);
select extensions.ok(
  has_table_privilege('anon', 'public.restaurants', 'SELECT'),
  'anonymous users can read the public restaurant directory'
);
select extensions.ok(
  not has_function_privilege('anon', 'private.is_master_admin()', 'EXECUTE'),
  'anonymous users cannot execute the Master authorization helper'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE'),
  'anonymous users cannot call the RLS event trigger through RPC'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE'),
  'authenticated users cannot call the RLS event trigger through RPC'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.orders', 'SELECT'),
  'anonymous users cannot read orders directly'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.orders', 'INSERT'),
  'anonymous users cannot insert orders directly'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.order_items', 'SELECT'),
  'anonymous users cannot read order items directly'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.order_items', 'INSERT'),
  'anonymous users cannot insert order items directly'
);

select * from extensions.finish();
rollback;
