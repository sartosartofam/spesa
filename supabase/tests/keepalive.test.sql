begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

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

select * from finish();
rollback;
