begin;

select plan(3);

select ok(
  exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ),
  'la publication supabase_realtime esiste'
);

select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'items'
  ),
  'items è pubblicata su Realtime'
);

-- Senza REPLICA IDENTITY FULL il payload di DELETE contiene solo l'id e il
-- filtro family_id del client non può valutarlo: gli altri membri non
-- vedrebbero la rimozione.
select is(
  (
    select relreplident::text
    from pg_class
    where oid = 'public.items'::regclass
  ),
  'f',
  'items usa REPLICA IDENTITY FULL per i DELETE filtrabili'
);

select * from finish();

rollback;
