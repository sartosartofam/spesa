begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- Struttura e superficie ------------------------------------------------------

select has_trigger(
  'public',
  'items',
  'items_add_rate_limit',
  'il trigger del rate limit sulle aggiunte esiste'
);

select ok(
  not has_function_privilege('authenticated', 'public.enforce_items_add_rate_limit()', 'execute'),
  'authenticated non esegue la funzione trigger'
);

select ok(
  not has_function_privilege('anon', 'public.enforce_items_add_rate_limit()', 'execute'),
  'anon non esegue la funzione trigger'
);

-- Dati di partenza ------------------------------------------------------------

-- La famiglia ...0001 arriva dal seed. La ...0003 serve a isolare il test;
-- la ...0004 al secondo utente, che non deve essere penalizzato.
insert into public.families (id, name)
values
  ('00000000-0000-4000-8000-000000000003', 'Famiglia Test Rate Limit'),
  ('00000000-0000-4000-8000-000000000004', 'Famiglia Test Rate Limit Due')
on conflict (id) do nothing;

insert into auth.users (id, email)
values
  ('77777777-7777-7777-7777-777777777777', 'rate-limit-uno@example.test'),
  ('77777777-7777-7777-7777-777777777778', 'rate-limit-due@example.test');

insert into public.members (id, family_id, email, display_name)
values
  (
    '77777777-7777-7777-7777-777777777777',
    '00000000-0000-4000-8000-000000000003',
    'rate-limit-uno@example.test',
    'Limite uno'
  ),
  (
    '77777777-7777-7777-7777-777777777778',
    '00000000-0000-4000-8000-000000000004',
    'rate-limit-due@example.test',
    'Limite due'
  );

-- Utente uno: il budget è 30 aggiunte al minuto -------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    insert into public.items (family_id, name)
    select '00000000-0000-4000-8000-000000000003', 'Rate limit ' || g
    from generate_series(1, 30) as g
  $$,
  'le prime 30 aggiunte della finestra passano'
);

select throws_ok(
  $$
    insert into public.items (family_id, name)
    values ('00000000-0000-4000-8000-000000000003', 'Rate limit 31')
  $$,
  'PT429',
  'Troppe aggiunte in poco tempo. Riprova tra poco.',
  'la trentunesima aggiunta è rifiutata con PT429'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = '00000000-0000-4000-8000-000000000003'
  ),
  30,
  'l''aggiunta rifiutata non entra in lista'
);

-- Il limite riguarda le aggiunte: modificare un articolo resta possibile anche
-- a budget esaurito.
select lives_ok(
  $$
    update public.items
    set note = 'nota dopo il limite'
    where family_id = '00000000-0000-4000-8000-000000000003'
  $$,
  'con il budget esaurito si possono ancora modificare gli articoli'
);

-- Secondo utente: il contatore è per utente, non per famiglia né globale.
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-7777-7777-777777777778","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    insert into public.items (family_id, name)
    values ('00000000-0000-4000-8000-000000000004', 'Rate limit altro utente')
  $$,
  'un secondo utente non è penalizzato dal budget del primo'
);

-- Seed, restore e service_role non hanno un JWT utente: nessun limite.
reset role;
select set_config('request.jwt.claims', '', true);

select lives_ok(
  $$
    insert into public.items (family_id, name)
    select '00000000-0000-4000-8000-000000000003', 'Senza jwt ' || g
    from generate_series(1, 40) as g
  $$,
  'senza JWT (seed, restore, service_role) il limite non si applica'
);

-- Il contatore resta invisibile ai ruoli API.
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.rate_limits $$,
  '42501',
  null,
  'il contatore del rate limit non è leggibile dai ruoli API'
);

select * from finish();
rollback;
