begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Funzioni -------------------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'public.current_family_id()', 'execute'),
  'anon non può eseguire current_family_id'
);

select ok(
  has_function_privilege('authenticated', 'public.current_family_id()', 'execute'),
  'authenticated può eseguire current_family_id'
);

select ok(
  not has_function_privilege('anon', 'public.set_updated_at()', 'execute'),
  'anon non può eseguire le funzioni trigger'
);

select ok(
  not has_function_privilege('authenticated', 'public.set_updated_at()', 'execute'),
  'authenticated non può eseguire le funzioni trigger'
);

select is(
  (
    select count(*)::int
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname not in (
        'current_family_id',
        'ensure_current_family',
        'create_family_invite',
        'promote_family_owner',
        'redeem_family_invite',
        'rename_family'
      )
      and (
        has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
      )
  ),
  0,
  'nessun''altra funzione di public è eseguibile dai ruoli API'
);

-- Grant per colonna su items -------------------------------------------------

select ok(
  has_column_privilege('authenticated', 'public.items', 'name', 'UPDATE'),
  'authenticated può aggiornare items.name'
);

select ok(
  not has_column_privilege('authenticated', 'public.items', 'created_by', 'UPDATE'),
  'authenticated non può aggiornare items.created_by'
);

-- Nuove tabelle in public ----------------------------------------------------

create table public.security_probe (id int);

select ok(
  not has_table_privilege('anon', 'public.security_probe', 'select')
  and not has_table_privilege('authenticated', 'public.security_probe', 'select'),
  'una nuova tabella di public non è auto-esposta ai ruoli API'
);

select * from finish();
rollback;
