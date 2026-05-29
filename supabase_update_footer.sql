-- ============================================================
-- DJ Innovations — Footer Configuration
-- Exécuter dans Supabase SQL Editor
-- ============================================================

ALTER TABLE public.landing_config 
ADD COLUMN IF NOT EXISTS footer_email TEXT DEFAULT 'freelancer@konektegroup.com',
ADD COLUMN IF NOT EXISTS footer_nav_title TEXT DEFAULT 'Navigasyon',
ADD COLUMN IF NOT EXISTS footer_nav_link1 TEXT DEFAULT 'Akey',
ADD COLUMN IF NOT EXISTS footer_nav_link2 TEXT DEFAULT 'Ekspè a',
ADD COLUMN IF NOT EXISTS footer_nav_link3 TEXT DEFAULT 'Temwayaj',
ADD COLUMN IF NOT EXISTS footer_nav_link4 TEXT DEFAULT 'Pòtfolyo Kanpay',
ADD COLUMN IF NOT EXISTS footer_nav_link5 TEXT DEFAULT 'FAQ',
ADD COLUMN IF NOT EXISTS footer_services_title TEXT DEFAULT 'Sèvis',
ADD COLUMN IF NOT EXISTS footer_contact_title TEXT DEFAULT 'Kontakte Nou',
ADD COLUMN IF NOT EXISTS footer_cta_text TEXT DEFAULT 'Kòmanse Kounye a →',
ADD COLUMN IF NOT EXISTS footer_copyright TEXT DEFAULT '© 2026 DJ Innovations. Tout dwa rezève. 🔥',
ADD COLUMN IF NOT EXISTS footer_whatsapp_text TEXT DEFAULT '💬 WhatsApp Dirèk',
ADD COLUMN IF NOT EXISTS footer_email_text TEXT DEFAULT '✉️ Imèl';

-- S'assurer que les valeurs par défaut sont appliquées au row 1 existant
UPDATE public.landing_config SET footer_email = 'freelancer@konektegroup.com' WHERE id = 1 AND (footer_email IS NULL OR footer_email = '');
