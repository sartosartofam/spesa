begin;

select plan(2);

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

select * from finish();

rollback;
