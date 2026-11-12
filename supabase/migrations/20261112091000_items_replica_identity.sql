-- Realtime con filtro per famiglia: DELETE completi.
--
-- Il client si sottoscrive a `items` con il filtro `family_id=eq.<id>`. Con la
-- replica identity di default (primary key) il payload di DELETE contiene solo
-- l'id: il filtro non riesce a valutare `family_id` e l'evento viene scartato,
-- quindi un articolo eliminato da un membro resterebbe visibile agli altri
-- fino al refresh successivo.
--
-- REPLICA IDENTITY FULL include la riga precedente nel payload. La RLS di
-- Realtime continua a consegnarlo solo ai membri della famiglia, quindi non
-- aumenta ciò che un utente può leggere.

alter table public.items replica identity full;
