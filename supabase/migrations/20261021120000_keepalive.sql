-- Tabella keepalive: una sola riga, pingata ogni giorno da Raspberry Pi e
-- GitHub Actions per evitare la pausa del progetto Supabase dopo 7 giorni
-- di inattività. Nessun dato della lista passa di qui.
--
-- Il ping è una SELECT su questa tabella (non un health check): solo così la
-- richiesta attraversa PostgREST e raggiunge Postgres.

create table public.keepalive (
  id int primary key default 1,
  last_ping timestamptz default now()
);

insert into public.keepalive (id) values (1);

alter table public.keepalive enable row level security;

revoke all on public.keepalive from anon, authenticated;

grant select on public.keepalive to anon;

create policy "Anyone can read keepalive"
on public.keepalive for select
to anon
using (true);
