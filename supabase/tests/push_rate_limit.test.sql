begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- Struttura ----------------------------------------------------------------

select has_table(
  'public', 'rate_limits', 'la tabella rate_limits esiste'
);
select col_is_pk(
  'public', 'rate_limits', 'key', 'key è la chiave primaria'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rate_limits'::regclass),
  'RLS è abilitata su rate_limits'
);

-- Nella parte iniziale si garantisce solo via funzione: la tabella resta
-- invisibile ai ruoli API e service_role passa dalla RPC.
select is(
  has_table_privilege('service_role', 'public.rate_limits', 'select'),
  true,
  'service_role legge la tabella'
);
select is(
  has_table_privilege('anon', 'public.rate_limits', 'select'),
  false,
  'anon non legge la tabella'
);
select is(
  has_table_privilege('authenticated', 'public.rate_limits', 'select'),
  false,
  'authenticated non legge la tabella'
);

select is(
  has_function_privilege(
    'service_role',
    'public.consume_rate_limit(text, integer, integer)',
    'execute'
  ),
  true,
  'service_role esegue consume_rate_limit'
);
select is(
  has_function_privilege(
    'anon',
    'public.consume_rate_limit(text, integer, integer)',
    'execute'
  ),
  false,
  'anon non esegue consume_rate_limit'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.consume_rate_limit(text, integer, integer)',
    'execute'
  ),
  false,
  'authenticated non esegue consume_rate_limit'
);

-- Comportamento -----------------------------------------------------------

-- Come service_role, senza credenziali utente: è proprio il ruolo che la
-- Edge Function usa.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

delete from public.rate_limits;

-- p_max = 2: i primi due consumi passano, il terzo no.
select is(
  public.consume_rate_limit('rl-test:key', 2, 60),
  true,
  'primo consumo dentro il budget'
);
select is(
  public.consume_rate_limit('rl-test:key', 2, 60),
  true,
  'secondo consumo dentro il budget'
);
select is(
  public.consume_rate_limit('rl-test:key', 2, 60),
  false,
  'terzo consumo supera il budget'
);

select is(
  (select count::int from public.rate_limits where key = 'rl-test:key'),
  3,
  'il contatore registra tutti i tentativi'
);

-- Chiavi diverse hanno budget indipendenti.
select is(
  public.consume_rate_limit('rl-test:key-altra', 1, 60),
  true,
  'chiave diversa ha un proprio budget'
);
select is(
  public.consume_rate_limit('rl-test:key-altra', 1, 60),
  false,
  'stessa chiave, budget esaurito'
);

reset role;

-- Simulazione scadenza -----------------------------------------------------

update public.rate_limits
   set window_start = now() - interval '120 seconds'
 where key = 'rl-test:key';

set local role service_role;

select is(
  public.consume_rate_limit('rl-test:key', 2, 60),
  true,
  'la finestra scaduta si resetta'
);
select is(
  (select count::int from public.rate_limits where key = 'rl-test:key'),
  1,
  'dopo il reset il contatore riparte da 1'
);

-- Anon / authenticated -----------------------------------------------------

reset role;

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ select * from public.rate_limits $$,
  '42501',
  'permission denied for table rate_limits',
  'authenticated non può leggere rate_limits'
);

reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$ select * from public.rate_limits $$,
  '42501',
  'permission denied for table rate_limits',
  'anon non può leggere rate_limits'
);

reset role;

-- Parametri non validi (come service_role) ---------------------------------

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select throws_ok(
  $$ select public.consume_rate_limit(null, 2, 60) $$,
  '22023',
  'Parametri del rate limit non validi.',
  'chiave nulla rifiutata'
);
select throws_ok(
  $$ select public.consume_rate_limit('', 2, 60) $$,
  '22023',
  'Parametri del rate limit non validi.',
  'chiave vuota rifiutata'
);
select throws_ok(
  $$ select public.consume_rate_limit('rl-test:key', 0, 60) $$,
  '22023',
  'Parametri del rate limit non validi.',
  'p_max = 0 rifiutato'
);
select throws_ok(
  $$ select public.consume_rate_limit('rl-test:key', 2, 0) $$,
  '22023',
  'Parametri del rate limit non validi.',
  'p_window_seconds = 0 rifiutato'
);
select throws_ok(
  $$ select public.consume_rate_limit(repeat('a', 121), 2, 60) $$,
  '22023',
  'Chiave del rate limit troppo lunga.',
  'chiave troppo lunga rifiutata'
);

reset role;

-- Difetto di chiave troppo lunga a livello vincolo -------------------------

select throws_ok(
  $$ insert into public.rate_limits (key) values (repeat('a', 121)) $$,
  '23514',
  'new row for relation "rate_limits" violates check constraint "rate_limits_key_length"',
  'il vincolo di lunghezza blocca l''inserimento diretto'
);

select * from finish();
rollback;
