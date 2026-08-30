ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS timezone_name text,
ADD COLUMN IF NOT EXISTS timezone_offset text,
ADD COLUMN IF NOT EXISTS valide_juska text,
ADD COLUMN IF NOT EXISTS checkout_url text;
