-- AJOUTER LES COLONNES POUR LES RÉSEAUX SOCIAUX
alter table public.landing_config 
add column if not exists tiktok_url text default '#',
add column if not exists facebook_url text default '#',
add column if not exists instagram_url text default '#';
