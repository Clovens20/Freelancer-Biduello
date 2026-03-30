-- Update landing_config in nouveauprojet schema

create schema if not exists nouveauprojet;

-- Create landing_config table
create table if not exists nouveauprojet.landing_config (
    id int primary key default 1,
    hero_badge text default '🔥 Premium Coaching Digitale',
    hero_title text default 'Transfòme lide w an<br><span class="gradient-text">Siksè Dijital</span>',
    hero_description text default 'Jwenn aksè ak yon ekspè ki pral travay avèk ou pandan 6 èdtan pa semèn pou tout 1 mwa. Tout sa ou bezwen pou TikTok, Facebook Ads ak coaching pèsonèl.',
    hero_image_url text default 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    ap_photo_url text default 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    ap_title text default 'Kisa <span class="gradient-text">DJ Innovations</span> ye?',
    ap_description text default 'Bonjou! Mwen se fondatè DJ Innovations. Pandan plis pase 5 ane, mwen ede antreprenè yo grandi. Misyon mwen: transfòme lide w an rezilta reyèl.',
    footer_slogan text default 'Nou la pou n fè piblisite ak coaching ou devni yon siksè.',
    updated_at timestamp with time zone default now()
);

-- Ensure only one row exists
insert into nouveauprojet.landing_config (id) values (1) on conflict (id) do nothing;

-- RLS
alter table nouveauprojet.landing_config enable row level security;
drop policy if exists "Piblik ka li landing_config" on nouveauprojet.landing_config;
create policy "Piblik ka li landing_config" on nouveauprojet.landing_config for select using (true);
drop policy if exists "Admin ka update landing_config" on nouveauprojet.landing_config;
create policy "Admin ka update landing_config" on nouveauprojet.landing_config for update using (true);
