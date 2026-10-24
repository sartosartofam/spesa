-- Rinomina della famiglia riservata all'owner.
--
-- L'update diretto di `families.name` era concesso a tutti i membri. La RPC
-- controlla il ruolo, normalizza il nome e resta l'unica via supportata: il
-- grant di colonna viene revocato per evitare bypass della regola.

revoke update (name) on public.families from authenticated;

drop policy "family members can rename their family" on public.families;

create function public.rename_family(p_name text)
returns table (family_id uuid, family_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_role text;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_user_id is null then
    raise exception 'Utente non autenticato.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'Il nome della famiglia non può essere vuoto.' using errcode = '22023';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'Il nome della famiglia è troppo lungo (massimo 80 caratteri).'
      using errcode = '22023';
  end if;

  select m.family_id, m.role
  into v_family_id, v_role
  from public.members m
  where m.id = v_user_id;

  if v_family_id is null then
    raise exception 'Famiglia non trovata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  if v_role <> 'owner' then
    raise exception 'Solo un owner può rinominare la famiglia.' using errcode = '42501';
  end if;

  update public.families
  set name = v_name
  where id = v_family_id;

  return query
  select f.id, f.name
  from public.families f
  where f.id = v_family_id;
end;
$$;

revoke all on function public.rename_family(text) from public, anon;
grant execute on function public.rename_family(text) to authenticated, service_role;
