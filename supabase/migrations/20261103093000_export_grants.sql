-- Export backup (ADR-0003).
--
-- La Edge Function `export` legge tutte le tabelle applicative con
-- `service_role`: a `keepalive` mancavano SELECT, INSERT e UPDATE (servono
-- per l'export e per l'upsert del restore di prova). La RLS resta attiva e
-- le concessioni riguardano solo il backup lato server, non i ruoli API del
-- client.
grant select, insert, update on public.keepalive to service_role;
