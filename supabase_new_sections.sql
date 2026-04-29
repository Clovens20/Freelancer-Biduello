-- ============================================================
-- DJ Innovations — Nouvelles Tables V2
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- Table témoignages (éditables depuis le dashboard)
CREATE TABLE IF NOT EXISTS temoignages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  ordre INT DEFAULT 0,
  nom TEXT NOT NULL,
  service TEXT DEFAULT 'Coaching',
  badge_resultat TEXT DEFAULT '+40% vant',
  citation TEXT NOT NULL,
  avatar_url TEXT,
  actif BOOLEAN DEFAULT true
);

-- Insérer les 6 témoignages par défaut
INSERT INTO temoignages (ordre, nom, service, badge_resultat, citation, avatar_url) VALUES
(1, 'Wadline P.', 'Coaching', '+40% vant nan 30 jou', 'Aprè 1 mwa coaching, biznis mwen chanje nèt. DJ se yon ekspè vrèman!', 'assets/avatars/haitian_woman_1_1777075567329.png'),
(2, 'Judson F.', 'Facebook Ads', 'ROAS 5.1x', 'Mwen depanse $200 reklam, mwen fè $1020 vant. Mèsi anpil!', 'assets/avatars/haitian_man_1_1777075578948.png'),
(3, 'Dieula V.', 'TikTok Ads', '10k followers nan 3 semèn', 'TikTok mwen te mouri, kounye a li ap boule chak jou!', 'assets/avatars/haitian_woman_2_1777075589349.png'),
(4, 'Marc-Arthur T.', 'Coaching Business', '3x plis kliyan', 'Estrateji DJ ba mwen an chanje tout bagay pou antrepriz mwen.', 'assets/avatars/haitian_man_2_1777075602573.png'),
(5, 'Daphney J.', 'Facebook Ads', '+65% trafik', 'Kliyan ap rele mwen kounye a, mwen pa bezwen kouri dèyè yo ankò!', 'assets/avatars/haitian_woman_3_1777075617264.png'),
(6, 'Woodensky C.', 'Coaching', 'Lanse biznis nan 45 jou', 'Mwen pa t konn kote pou kòmanse, DJ gide mwen pas-a-pas.', 'assets/avatars/haitian_man_3_1777075630903.png');

-- Enable RLS
ALTER TABLE temoignages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read temoignages" ON temoignages;
CREATE POLICY "Public read temoignages" ON temoignages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write temoignages" ON temoignages;
CREATE POLICY "Auth write temoignages" ON temoignages FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Public insert temoignages" ON temoignages;
CREATE POLICY "Public insert temoignages" ON temoignages FOR INSERT WITH CHECK (actif = false);

-- ─────────────────────────────────────────────────────────────

-- Table portfolio campagnes
CREATE TABLE IF NOT EXISTS portfolio_campagnes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  ordre INT DEFAULT 0,
  plateforme TEXT DEFAULT 'facebook',  -- facebook | tiktok | instagram
  couleur_plateforme TEXT DEFAULT '#1877F2',
  secteur TEXT NOT NULL,
  budget TEXT NOT NULL,
  resultat TEXT NOT NULL,
  metrique_label TEXT DEFAULT 'ROAS',
  metrique_valeur NUMERIC DEFAULT 0,
  periode TEXT DEFAULT '30 jou',
  actif BOOLEAN DEFAULT true
);

-- Insérer les 4 campagnes par défaut
INSERT INTO portfolio_campagnes (ordre, plateforme, couleur_plateforme, secteur, budget, resultat, metrique_label, metrique_valeur, periode) VALUES
(1, 'facebook', '#1877F2', 'Restaurant Lakay', '$300', 'Vant: $1,890', 'ROAS', 6.3, '21 jou'),
(2, 'tiktok', '#ff0050', 'Boutique Mode', '$150', 'Followers: +8,200', 'CPL', 0.018, '14 jou'),
(3, 'facebook', '#1877F2', 'Coach Fitness', '$200', 'Leads: 147', 'CPL', 1.36, '30 jou'),
(4, 'instagram', '#E1306C', 'Salon Beaute', '$100', 'Rezervasyon: +38', 'ROAS', 4.8, '7 jou');

-- Enable RLS
ALTER TABLE portfolio_campagnes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read portfolio" ON portfolio_campagnes;
CREATE POLICY "Public read portfolio" ON portfolio_campagnes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write portfolio" ON portfolio_campagnes;
CREATE POLICY "Auth write portfolio" ON portfolio_campagnes FOR ALL USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────

-- Table devis entreprises
CREATE TABLE IF NOT EXISTS devis_entreprises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  nom_entreprise TEXT NOT NULL,
  secteur TEXT,
  budget_mensuel TEXT,
  objectif TEXT,
  email TEXT NOT NULL,
  telephone TEXT,
  statut TEXT DEFAULT 'nouveau'
);

-- Enable RLS
ALTER TABLE devis_entreprises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert devis" ON devis_entreprises;
CREATE POLICY "Public insert devis" ON devis_entreprises FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Auth read devis" ON devis_entreprises;
CREATE POLICY "Auth read devis" ON devis_entreprises FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────

-- Colonnes additionnelles landing_config
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '18096651142';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS faq_items JSONB;

-- Colonnes Footer
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS footer_terms_text TEXT DEFAULT 'Tèm & Kondisyon';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS footer_terms_url TEXT DEFAULT '#';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS footer_privacy_text TEXT DEFAULT 'Politik Konfidansyalite';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS footer_privacy_url TEXT DEFAULT '#';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS footer_support_text TEXT DEFAULT 'Sipò';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS footer_support_url TEXT DEFAULT '#';

-- Colonnes Portfolio Section
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_tag TEXT DEFAULT '✦ Pòtfolyo nou yo';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_title TEXT DEFAULT 'Kanpay ki Fè Rezilta';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_subtitle TEXT DEFAULT 'Gade kèk egzanp kanpay piblisite reyèl nou te jere pou kliyan nou yo.';

-- Mettre à jour le numéro WhatsApp
UPDATE landing_config SET whatsapp_number = '18096651142' WHERE id = 1;

-- Insérer FAQ par défaut si faq_items est null
UPDATE landing_config SET faq_items = '[
  {"q": "Eske coaching la fèt an lign?", "r": "Wi, tout sesyon coaching yo fèt 100% an lign via Zoom oswa Google Meet. Ou ka patisipe kèlkeswa kote ou ye nan mond lan."},
  {"q": "Nan ki lang sesyon yo fèt?", "r": "Tout sesyon yo fèt an kreyòl ayisyen. Nou vize kliyan ayisyen toupatou nan mond lan."},
  {"q": "Konbyen tan yon sesyon coaching dire?", "r": "Chak sesyon dire 1 èdtan. Ou jwenn 6 sesyon pa mwa (6 èdtan total) selon plan ou a."},
  {"q": "Eske gen garanti rezilta?", "r": "Nou bay yon garanti satisfaksyon 100%. Si ou pa satisfè apre premye sesyon an, nou remèt ou lajan ou a san kesyon."},
  {"q": "Ki platfòm peman ou aksepte?", "r": "Nou aksepte Kat Kredi (Visa, Mastercard) via Stripe, ak MonCash pou kliyan ki ann Ayiti."},
  {"q": "Eske mwen ka peye an avans sèlman (50%)?", "r": "Wi! Ou ka chwazi peye 50% kounye a epi 50% anvan dezyèm sesyon an. Opsyon sa a disponib nan etap peman an."},
  {"q": "Ki diferans ant Coaching Pèsonèl ak Sèvis Business?", "r": "Coaching Pèsonèl se pou antreprenè k ap aprann estrateji dijital. Sèvis Business se nou k ap jere epi kreye kanpay piblisite pou biznis ou dirèkteman."},
  {"q": "Nan konbyen tan mwen ap wè rezilta?", "r": "Majorite kliyan nou yo wè premye rezilta nan 2-4 semèn. Rezilta final yo depann de plan ou a ak angajman ou."},
  {"q": "Eske mwen ka anile abònman mwen?", "r": "Wi, ou ka anile nenpòt ki lè san penalite. Nou jis mande yon preyavi 48 èdtan."},
  {"q": "Eske nou travay ak gwo antrepriz tou?", "r": "Absoliman! Nou gen plan espesyal pou antrepriz ak ajans. Kontakte nou dirèkteman pou yon devis pèsonalize."},
  {"q": "Eske mwen bezwen eksperyans nan maketing pou kòmanse?", "r": "Non! Coaching nou an adapte pou tout nivo — debutant kou avanse. Nou kòmanse kote ou ye a."},
  {"q": "Kijan m ka kontakte nou si mwen gen yon kesyon ijans?", "r": "Ou ka ekri nou dirèkteman sou WhatsApp (bouton an ba paj la) oswa voye yon imèl. Nou reponn nan mwens pase 2 èdtan."}
]'::jsonb WHERE id = 1 AND faq_items IS NULL;
