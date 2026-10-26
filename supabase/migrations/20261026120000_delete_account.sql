-- Cancellazione dell'account e dei dati associati (diritto all'oblio).
--
-- L'utente autenticato può eliminare solo se stesso: la funzione non accetta
-- parametri e usa sempre `auth.uid()`. La cancellazione di `auth.users` fa
-- scattare le foreign key `on delete cascade` su membership, impostazioni e
-- subscription push; `items.created_by` viene azzerato senza perdere la lista
-- della famiglia.
--
-- Prima di cancellare l'utente:
-- - se è l'unico membro, elimina la famiglia e la sua lista;
-- - se è owner con altri membri, passa il ruolo al membro più vecchio;
-- - se è member, lascia intatta la famiglia.

create function public.delete_current_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_role text;
  v_other_members integer;
  v_other_owners integer;
  v_new_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'Non autenticato.' using errcode = '42501';
  end if;

  select m.family_id, m.role
  into v_family_id, v_role
  from public.members m
  where m.id = v_user_id
  for update;

  if v_family_id is not null then
    -- Stessa serializzazione di leave_family: due cancellazioni nella stessa
    -- famiglia non devono eleggere due owner o lasciarne zero.
    perform pg_advisory_xact_lock(hashtextextended(v_family_id::text, 0));

    perform 1
    from public.families f
    where f.id = v_family_id
    for update;

    select count(*)
    into v_other_members
    from public.members m
    where m.family_id = v_family_id
      and m.id <> v_user_id;

    if v_other_members = 0 then
      delete from public.families
      where id = v_family_id;
    elsif v_role = 'owner' then
      select count(*)
      into v_other_owners
      from public.members m
      where m.family_id = v_family_id
        and m.role = 'owner'
        and m.id <> v_user_id;

      if v_other_owners = 0 then
        select m.id
        into v_new_owner_id
        from public.members m
        where m.family_id = v_family_id
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
  end if;

  -- Le cascade eliminano membership, impostazioni, subscription push e inviti
  -- creati dall'utente. Gli articoli restano alla famiglia senza creatore.
  delete from auth.users
  where id = v_user_id;
end;
$$;

comment on function public.delete_current_account() is
  'Elimina l''account autenticato e i dati personali associati; se serve passa l''owner a un altro membro.';

revoke all on function public.delete_current_account() from public, anon;
grant execute on function public.delete_current_account() to authenticated, service_role;
