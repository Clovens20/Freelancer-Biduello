-- Exécutez ceci dans le SQL Editor de Supabase
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_tag TEXT DEFAULT '✦ Pòtfolyo nou yo';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_title TEXT DEFAULT 'Kanpay ki Fè Rezilta';
ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_subtitle TEXT DEFAULT 'Gade kèk egzanp kanpay piblisite reyèl nou te jere pou kliyan nou yo.';
