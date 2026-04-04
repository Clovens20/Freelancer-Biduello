-- Ajoute les colonnes de configuration pour la page Business
ALTER TABLE landing_config 
ADD COLUMN IF NOT EXISTS business_hero_badge TEXT DEFAULT '✦ Nouvo Sèvis — Business',
ADD COLUMN IF NOT EXISTS business_hero_title TEXT DEFAULT 'Mete Maketing Dijital<br>Biznis ou <span>Nan Men Ekspè</span>',
ADD COLUMN IF NOT EXISTS business_hero_description TEXT DEFAULT 'Solisyon konplè pou ti, mwayen ak gwo biznis. Chwazi plan ki adapte ak bezwen ou epi kite nou okipe rès la.',
ADD COLUMN IF NOT EXISTS business_plans_tag TEXT DEFAULT '✦ Plans disponib',
ADD COLUMN IF NOT EXISTS business_plans_title TEXT DEFAULT 'Chwazi Plan ou',
ADD COLUMN IF NOT EXISTS business_plans_subtitle TEXT DEFAULT 'Chwazi yon plan pou kòmanse. Ou ka chanje plita selon evoli biznis ou.',
ADD COLUMN IF NOT EXISTS business_form_tag TEXT DEFAULT '✦ Enfòmasyon Biznis',
ADD COLUMN IF NOT EXISTS business_form_title TEXT DEFAULT 'Ranpli Fòm nan',
ADD COLUMN IF NOT EXISTS business_form_subtitle TEXT DEFAULT 'Ranpli enfòmasyon yo epi nou pral kontakte ou nan 24 èdtan.';
