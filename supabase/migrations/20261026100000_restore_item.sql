-- Ripristino di un articolo per undo/redo.
--
-- Il repository non può più inserire direttamente `id`, timestamp e `bought_at`
-- (vedi 20261026090000_least_privilege.sql). Questa RPC `security definer`
-- espone solo l'operazione necessaria a undo/redo, derivando la famiglia
-- dall'utente autenticato e impedendo di toccare righe di altre famiglie.
-- I timestamp arrivano dallo snapshot client perché la riga eliminata non è
-- più leggibile: la RPC li accetta solo dentro la famiglia dell'utente e non
-- riapre i grant diretti sulla tabella.

create function public.restore_item(
  p_id uuid,
  p_name text,
  p_category text,
  p_status public.item_status,
  p_urgent boolean,
  p_note text,
  p_quantity text,
  p_created_at timestamptz,
  p_bought_at timestamptz
)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid := public.current_family_id();
  v_item public.items;
begin
  if auth.uid() is null or v_family_id is null then
    raise exception 'Utente senza famiglia' using errcode = '42501';
  end if;

  select *
  into v_item
  from public.items
  where id = p_id;

  if found then
    if v_item.family_id is distinct from v_family_id then
      raise exception 'Articolo non trovato' using errcode = '42501';
    end if;

    update public.items
    set name = p_name,
        category = p_category,
        status = p_status,
        urgent = p_urgent,
        note = p_note,
        quantity = p_quantity
    where id = p_id
    returning * into v_item;

    return v_item;
  end if;

  insert into public.items (
    id,
    family_id,
    name,
    category,
    status,
    urgent,
    note,
    quantity,
    created_by,
    created_at,
    bought_at
  )
  values (
    p_id,
    v_family_id,
    p_name,
    p_category,
    p_status,
    p_urgent,
    p_note,
    p_quantity,
    auth.uid(),
    coalesce(p_created_at, now()),
    case when p_status = 'bought' then coalesce(p_bought_at, now()) else null end
  )
  returning * into v_item;

  return v_item;
end;
$$;

revoke all on function public.restore_item(
  uuid,
  text,
  text,
  public.item_status,
  boolean,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon;

grant execute on function public.restore_item(
  uuid,
  text,
  text,
  public.item_status,
  boolean,
  text,
  text,
  timestamptz,
  timestamptz
) to authenticated, service_role;
