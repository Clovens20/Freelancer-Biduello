
-- 1. Maj landing_config pou gen tout tèks ki ka modifye
ALTER TABLE landing_config 
ADD COLUMN IF NOT EXISTS business_form_label_prenom TEXT DEFAULT 'Nom konplè Responsab *',
ADD COLUMN IF NOT EXISTS business_form_label_nom TEXT DEFAULT 'Non Entreprise la *',
ADD COLUMN IF NOT EXISTS business_form_placeholder_prenom TEXT DEFAULT 'Antre non konplè w',
ADD COLUMN IF NOT EXISTS business_form_placeholder_nom TEXT DEFAULT 'Antre non biznis ou',
ADD COLUMN IF NOT EXISTS business_form_label_email TEXT DEFAULT 'Imèl *',
ADD COLUMN IF NOT EXISTS business_form_label_tel TEXT DEFAULT 'Telefòn *',
ADD COLUMN IF NOT EXISTS business_form_label_msg TEXT DEFAULT 'Mesaj',
ADD COLUMN IF NOT EXISTS label_coaching_tab TEXT DEFAULT '🎓 Coaching Pèsonèl',
ADD COLUMN IF NOT EXISTS label_business_tab TEXT DEFAULT '🏢 Sèvis Business',
ADD COLUMN IF NOT EXISTS business_promo_btn_text TEXT DEFAULT 'Dekouvri Plan Business yo →',
ADD COLUMN IF NOT EXISTS coaching_form_label_prenom TEXT DEFAULT 'Prenon *',
ADD COLUMN IF NOT EXISTS coaching_form_label_nom TEXT DEFAULT 'Non Fanmi *',
ADD COLUMN IF NOT EXISTS coaching_form_placeholder_prenom TEXT DEFAULT 'Antre prenon ou',
ADD COLUMN IF NOT EXISTS coaching_form_placeholder_nom TEXT DEFAULT 'Antre non ou',
ADD COLUMN IF NOT EXISTS section_eyebrow_ap TEXT DEFAULT '✦ Avant-Propos',
ADD COLUMN IF NOT EXISTS section_eyebrow_step1 TEXT DEFAULT '✦ Étap 1';

-- 2. Maj services pou asire kategori ak ikon yo la
ALTER TABLE services
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'coaching',
ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🧡',
ADD COLUMN IF NOT EXISTS unite TEXT DEFAULT 'mwa';

-- 3. Mete done pa defo si bezwen (opsyonèl paske ALTER TABLE bay defo deja)
UPDATE landing_config SET id = 1 WHERE id = 1;
