-- Ajoute yon kolon pou swiv dènye rapèl coaching ki voye
-- Sa ap evite kliyan an resevwa plizyè mesaj pou menm sesyon an
alter table if exists public.reservations 
add column if not exists last_coaching_reminder_at timestamp with time zone;

-- Index pou demann yo ka pi vit
create index if not exists idx_reservations_last_coaching_reminder on public.reservations (last_coaching_reminder_at);
