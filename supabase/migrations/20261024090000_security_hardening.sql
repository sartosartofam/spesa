-- Hardening di sicurezza del backend (fase 1).
--
-- Audit dopo il collegamento del repository Supabase (issue #6):
-- 1. `items` aveva UPDATE su tutte le colonne: un membro poteva modificare
--    `id`, `family_id`, `created_by`, timestamp e `bought_at`. La RLS impediva
--    di uscire dalla famiglia, ma il principio di minimo privilegio richiede
--    di esporre solo le colonne che il client usa davvero.
-- 2. Le funzioni trigger erano richiamabili dai ruoli API con il grant di
--    default a PUBLIC. Non sono sfruttabili (ritornano `trigger`), ma non
--    devono essere chiamabili via RPC.
-- 3. I campi testuali liberi non avevano limiti: un client autenticato poteva
--    inserire note/quantità enormi, con spreco di spazio e payload pesanti.
--    I limiti ricalcano quelli della UI (categoria 30, nota 120, quantità 40).
-- 4. Le subscription push avevano endpoint e chiavi senza limiti ragionevoli.
--
-- Le policy RLS restano invariate: questo file riduce la superficie dei grant
-- e aggiunge vincoli di integrità, senza cambiare la visibilità tra famiglie.

-- 1. UPDATE solo sulle colonne gestite dal repository -------------------------

revoke update on public.items from authenticated;

grant update (name, category, status, urgent, note, quantity)
  on public.items
  to authenticated;

-- 2. Funzioni trigger non richiamabili via API -------------------------------

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_bought_at() from public, anon, authenticated;

-- Nota: in PostgreSQL una funzione nuova riceve EXECUTE da PUBLIC. I default
-- privileges di Supabase aggiungono grant espliciti ai ruoli API, quindi non
-- basta un ALTER DEFAULT PRIVILEGES per chiudere la porta. Ogni nuova funzione
-- va revocata e concessa esplicitamente; il test security.test.sql fallisce
-- se una funzione di public resta richiamabile da anon/authenticated.

-- 3. Limiti sui testi liberi degli articoli ----------------------------------

alter table public.items
  add constraint items_category_length
    check (category is null or char_length(category) between 1 and 30),
  add constraint items_note_length
    check (note is null or char_length(note) between 1 and 120),
  add constraint items_quantity_length
    check (quantity is null or char_length(quantity) between 1 and 40);

-- 4. Limiti sulle subscription push ------------------------------------------

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_length
    check (char_length(endpoint) between 1 and 2048),
  add constraint push_subscriptions_endpoint_https
    check (endpoint ~ '^https://'),
  add constraint push_subscriptions_keys_size
    check (length(keys::text) <= 4096);
