begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select has_table('public', 'keepalive', 'la tabella keepalive esiste');
select col_is_pk('public', 'keepalive', 'id', 'id è la primary key');
select is(
  (select count(*)::int from public.keepalive),
  1,
  'keepalive contiene una sola riga'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.keepalive'::regclass),
  'RLS è abilitata su keepalive'
);

-- Grant per backup (ADR-0003): la Edge Function `export` e lo script di
-- restore lavorano con service_role.
select is(
  has_table_privilege('service_role', 'public.keepalive', 'select'),
  true,
  'service_role legge keepalive per l''export'
);
select is(
  has_table_privilege('service_role', 'public.keepalive', 'insert'),
  true,
  'service_role può upsertare keepalive nel restore'
);
select is(
  has_table_privilege('anon', 'public.keepalive', 'select'),
  true,
  'anon continua a leggere keepalive solo in select'
);

select * from finish();
rollback;
