begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select is(
  (
    select name
    from public.families
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  'Famiglia Demo',
  'il seed crea la famiglia demo'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = '00000000-0000-4000-8000-000000000001'
  ),
  7,
  'il seed crea sette articoli demo'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = '00000000-0000-4000-8000-000000000001'
      and status = 'to_buy'
  ),
  5,
  'cinque articoli sono in lista'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = '00000000-0000-4000-8000-000000000001'
      and status = 'bought'
  ),
  2,
  'due articoli sono nello storico'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = '00000000-0000-4000-8000-000000000001'
      and urgent
  ),
  1,
  'un articolo demo è urgente'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = '00000000-0000-4000-8000-000000000001'
      and category = 'Altro'
  ),
  1,
  'il seed copre anche la categoria Altro'
);

select * from finish();
rollback;
