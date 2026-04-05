-- DJ Innovations: Adding Pixel Integration Columns to landing_config
-- Schema: nouveauprojet

ALTER TABLE nouveauprojet.landing_config 
ADD COLUMN IF NOT EXISTS fb_pixel_id text,
ADD COLUMN IF NOT EXISTS tiktok_pixel_id text,
ADD COLUMN IF NOT EXISTS ga_id text,
ADD COLUMN IF NOT EXISTS snapchat_pixel_id text,
ADD COLUMN IF NOT EXISTS pinterest_pixel_id text;

-- Optional: Initial placeholder if needed (optional)
COMMENT ON COLUMN nouveauprojet.landing_config.fb_pixel_id IS 'ID de Facebook Pixel (ex: 123456789)';
COMMENT ON COLUMN nouveauprojet.landing_config.tiktok_pixel_id IS 'ID de TikTok Pixel (ex: C0123456789)';
COMMENT ON COLUMN nouveauprojet.landing_config.ga_id IS 'ID de Google Analytics 4 (ex: G-XXXXXXXXXX)';
COMMENT ON COLUMN nouveauprojet.landing_config.snapchat_pixel_id IS 'ID de Snapchat Pixel (ex: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)';
COMMENT ON COLUMN nouveauprojet.landing_config.pinterest_pixel_id IS 'ID de Pinterest Pixel (ex: 261XXXXXXXXXX)';
