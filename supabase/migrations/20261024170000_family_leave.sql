-- Uscita dalla famiglia: rimuove la membership corrente e crea una nuova
-- famiglia personale per l'utente, così non resta mai senza famiglia.
--
-- Se esce un owner e restano altri membri, il ruolo passa al membro presente
-- da più tempo (`created_at`, con `id` come tie-break). Se non restano membri,
-- la vecchia famiglia e la sua lista vengono eliminate.
--
-- `p_family_id` evita di uscire per errore da una famiglia diversa da quella
-- che l'utente stava guardando (doppio click o richiesta stale).

create function public.leave_family(p_family_id uuid)
returns table (
  left_family_id uuid,
  new_owner_id uuid,
  new_family_id uuid,
  new_family_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_family_id uuid;
  v_role text;
  v_other_members integer;
  v_other_owners integer;
  v_new_owner_id uuid;
  v_new_family_id uuid;
  v_new_family_name text;
begin
  if v_user_id is null then
    raise exception 'Non autenticato.' using errcode = '42501';
  end if;

  if p_family_id is null then
    raise exception 'Famiglia non valida.' using errcode = '22023';
  end if;

  select m.family_id, m.role
  into v_current_family_id, v_role
  from public.members m
  where m.id = v_user_id;

  if v_current_family_id is null then
    raise exception 'Famiglia non trovata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  if v_current_family_id <> p_family_id then
    raise exception 'La famiglia è cambiata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  -- Serializza due uscite dalla stessa famiglia: il lock sulla famiglia da
  -- solo non basta, perché la successione aggiorna la riga di un altro membro.
  perform pg_advisory_xact_lock(hashtextextended(v_current_family_id::text, 0));

  select m.family_id, m.role
  into v_current_family_id, v_role
  from public.members m
  where m.id = v_user_id
  for update;

  if v_current_family_id is null then
    raise exception 'Famiglia non trovata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  if v_current_family_id <> p_family_id then
    raise exception 'La famiglia è cambiata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  perform 1
  from public.families f
  where f.id = v_current_family_id
  for update;

  select count(*)
  into v_other_members
  from public.members m
  where m.family_id = v_current_family_id
    and m.id <> v_user_id;

  -- Se non c'è già un altro owner, il ruolo passa al membro più vecchio.
  if v_role = 'owner' and v_other_members > 0 then
    select count(*)
    into v_other_owners
    from public.members m
    where m.family_id = v_current_family_id
      and m.role = 'owner'
      and m.id <> v_user_id;

    if v_other_owners = 0 then
      select m.id
      into v_new_owner_id
      from public.members m
      where m.family_id = v_current_family_id
        and m.id <> v_user_id
      order by m.created_at, m.id
      limit 1;

      if v_new_owner_id is not null then
        update public.members
        set role = 'owner'
        where id = v_new_owner_id
          and role <> 'owner';
      end if;
    end if;
  end if;

  if v_other_members = 0 then
    delete from public.families
    where id = v_current_family_id;
  else
    delete from public.members
    where id = v_user_id
      and family_id = v_current_family_id;
  end if;

  -- La funzione è idempotente e crea la famiglia personale dell'utente.
  v_new_family_id := public.ensure_current_family();

  select f.name
  into v_new_family_name
  from public.families f
  where f.id = v_new_family_id;

  if v_new_family_name is null then
    raise exception 'Famiglia non trovata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  return query
  select v_current_family_id, v_new_owner_id, v_new_family_id, v_new_family_name;
end;
$$;

comment on function public.leave_family(uuid) is
  'Esce dalla famiglia indicata, passa l''owner al membro più vecchio e crea una nuova famiglia personale.';

revoke all on function public.leave_family(uuid) from public, anon;
grant execute on function public.leave_family(uuid) to authenticated, service_role;
