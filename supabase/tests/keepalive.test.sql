begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

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

-- Ping registrato (RPC) -------------------------------------------------------

select has_function(
  'public',
  'ping_keepalive',
  'esiste la RPC che registra il battito'
);

select is(
  has_function_privilege('anon', 'public.ping_keepalive()', 'execute'),
  true,
  'anon può chiamare il ping'
);

select is(
  has_function_privilege('authenticated', 'public.ping_keepalive()', 'execute'),
  false,
  'authenticated non ha bisogno della RPC: non può chiamarla'
);

-- `anon` non riceve update sulla tabella: l'unico modo per scrivere last_ping
-- è la funzione, che tocca una colonna di una riga.
select is(
  has_table_privilege('anon', 'public.keepalive', 'update'),
  false,
  'anon non può aggiornare keepalive direttamente'
);

update public.keepalive
set last_ping = timestamptz '2020-01-01 00:00:00+00'
where id = 1;

set local role anon;
select isnt(
  public.ping_keepalive(),
  null,
  'anon chiama il ping e riceve il momento registrato'
);
reset role;

select is(
  (select last_ping from public.keepalive where id = 1) > now() - interval '1 minute',
  true,
  'il ping registra il battito in last_ping'
);

-- Guardrail: una raffica di chiamate non deve generare un update per ognuna.
update public.keepalive
set last_ping = now() - interval '10 seconds'
where id = 1;

set local role anon;
select isnt(
  public.ping_keepalive(),
  null,
  'una seconda chiamata ravvicinata risponde comunque'
);
reset role;

select is(
  (select last_ping from public.keepalive where id = 1),
  now() - interval '10 seconds',
  'il ping non riscrive il battito più di una volta al minuto'
);

select * from finish();
rollback;
