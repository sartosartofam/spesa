-- Realtime per la lista condivisa.
--
-- Supabase Realtime usa la publication `supabase_realtime`. La tabella va
-- aggiunta esplicitamente: la configurazione locale e quella cloud non
-- pubblicano automaticamente le nuove tabelle.
--
-- La RLS resta l'autorizzazione: Realtime consegna solo le righe che il
-- membro autenticato può leggere. Il client usa anche un filtro `family_id`
-- per ridurre traffico e riconnessioni.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
exception
  when duplicate_object then null;
end
$$;
