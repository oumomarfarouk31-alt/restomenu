-- Restrict direct API execution of the RLS auto-enable event trigger.
-- Event triggers invoke their registered function as part of DDL processing;
-- API roles do not need direct RPC permission to this function.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
