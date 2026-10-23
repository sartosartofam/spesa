-- Seed locale di sviluppo. Nessun dato reale della famiglia.
--
-- Questo file crea la famiglia e gli articoli demo. Gli utenti di test vivono
-- in `auth.users` e vengono creati da `scripts/seed-auth.mjs` (eseguito da
-- `npm run db:reset` oppure `npm run db:seed`), perché l'Auth non va popolato a
-- mano nel seed SQL.
--
-- Id fissi: servono a rendere il seed ripetibile e a collegare gli articoli
-- agli utenti demo nel secondo passaggio.

insert into public.families (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Famiglia Demo')
on conflict (id) do update set name = excluded.name;

insert into public.items (
  id,
  family_id,
  name,
  category,
  status,
  urgent,
  note,
  quantity,
  created_at,
  updated_at,
  bought_at
)
values
  (
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000001',
    'Mele',
    'Frutta e verdura',
    'to_buy',
    false,
    null,
    '1 kg',
    now() - interval '2 hours',
    now() - interval '2 hours',
    null
  ),
  (
    '00000000-0000-4000-8000-000000001002',
    '00000000-0000-4000-8000-000000000001',
    'Latte intero',
    'Freschi',
    'to_buy',
    true,
    'È finito',
    '2 litri',
    now() - interval '3 hours',
    now() - interval '3 hours',
    null
  ),
  (
    '00000000-0000-4000-8000-000000001003',
    '00000000-0000-4000-8000-000000000001',
    'Pasta',
    'Dispensa',
    'to_buy',
    false,
    null,
    '3 pacchi',
    now() - interval '5 hours',
    now() - interval '5 hours',
    null
  ),
  (
    '00000000-0000-4000-8000-000000001004',
    '00000000-0000-4000-8000-000000000001',
    'Detersivo piatti',
    'Casa',
    'to_buy',
    false,
    null,
    null,
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    '00000000-0000-4000-8000-000000001005',
    '00000000-0000-4000-8000-000000000001',
    'Pile',
    'Altro',
    'to_buy',
    false,
    'Formato AA',
    '4',
    now() - interval '2 days',
    now() - interval '2 days',
    null
  ),
  (
    '00000000-0000-4000-8000-000000001006',
    '00000000-0000-4000-8000-000000000001',
    'Pane integrale',
    'Freschi',
    'bought',
    false,
    null,
    '1',
    now() - interval '3 days',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-4000-8000-000000001007',
    '00000000-0000-4000-8000-000000000001',
    'Caffè',
    'Dispensa',
    'bought',
    false,
    null,
    '2 confezioni',
    now() - interval '4 days',
    now() - interval '3 days',
    now() - interval '3 days'
  )
on conflict (id) do update set
  family_id = excluded.family_id,
  name = excluded.name,
  category = excluded.category,
  status = excluded.status,
  urgent = excluded.urgent,
  note = excluded.note,
  quantity = excluded.quantity,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  bought_at = excluded.bought_at;
