-- DJ Innovations Setup for nouveauprojet schema

create schema if not exists nouveauprojet;

-- Table for freelancers/coaches
create table if not exists public.freelancers (
    id uuid primary key default gen_random_uuid(),
    nom text not null,
    email text not null unique,
    domaine text,
    actif boolean default true,
    discount_percent numeric default 10,
    created_at timestamp with time zone default now()
);

-- Table for services
create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),
    nom text not null,
    description text,
    fonctionnalites text[],
    prix numeric not null default 105,
    unite text default 'mwa',
    populaire boolean default false,
    actif boolean default true,
    freelancer_id uuid references public.freelancers(id),
    video_url text,
    formation_links text[],
    created_at timestamp with time zone default now()
);

-- Table for reservations
create table if not exists public.reservations (
    id uuid primary key default gen_random_uuid(),
    service_ids uuid[],
    freelancer_id uuid references public.freelancers(id),
    prenom text not null,
    nom text not null,
    email text not null,
    telephone text,
    message text,
    mode_paiement text,
    stripe_session_id text,
    statut text default 'en_attente',
    montant_total numeric,
    horaires jsonb, 
    created_at timestamp with time zone default now()
);

-- RLS (Row Level Security)
alter table public.freelancers enable row level security;
alter table public.services enable row level security;
alter table public.reservations enable row level security;

-- Policies
drop policy if exists "Piblik ka wè sèvis yo" on public.services;
create policy "Piblik ka wè sèvis yo" on public.services for select using (actif = true);

drop policy if exists "Piblik ka wè freelancer yo" on public.freelancers;
create policy "Piblik ka wè freelancer yo" on public.freelancers for select using (actif = true);

drop policy if exists "Piblik ka mete rezèvasyon" on public.reservations;
create policy "Piblik ka mete rezèvasyon" on public.reservations for insert with check (true);

drop policy if exists "Kliyan ka wè rezèvasyon yo" on public.reservations;
create policy "Kliyan ka wè rezèvasyon yo" on public.reservations for select using (true);

-- Initial Data
insert into public.freelancers (nom, email, domaine, discount_percent)
values ('DJ Innovation Team', 'contact@djinnovations.com', 'marketing', 15)
on conflict (email) do nothing;

insert into public.services (nom, description, fonctionnalites, prix, populaire, freelancer_id, video_url)
values 
('Kreye paj Facebook ak TikTok monetize', 'Coaching 1 mwa. Config TikTok Dev, paj pwofesyonèl e SEO de baz.', ARRAY['6 èdtan pa semèn', 'Config TikTok Dev', 'Paj FB Pwofesyonèl', 'SEO Baz'], 105, true, (select id from public.freelancers limit 1), 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
('Gere piblisite pou biznis ou', 'Kanpay piblisite Ads Manager, Facebook Ads ak Instagram Ads.', ARRAY['6 èdtan pa semèn', 'Facebook Ads', 'Instagram Ads', 'Analiz rezilta'], 105, false, (select id from public.freelancers limit 1), 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
('Coaching pèsonèl sou Facebook', 'Aprann domine algoritm lan. Coaching dirèk e estrateji kontni.', ARRAY['6 èdtan pa semèn', 'Estrateji kontni', 'Sipò dirèk'], 105, false, (select id from public.freelancers limit 1), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
