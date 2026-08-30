-- ==========================================
-- TAB POU VIDEOS AI (Vidéo AI)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.videos_ai (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  video_url text NOT NULL, -- Lyen Drive oswa Download
  thumbnail_url text, -- Lyen pou yon imaj demonstrasyon (pou site la pa lou)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Pèmèt lekti piblik pou tout moun ka wè videyo yo
ALTER TABLE public.videos_ai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access to videos_ai" ON public.videos_ai
  FOR SELECT USING (true);

-- ==========================================
-- TAB POU LÒD VIDEOS AI (Commandes)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.videos_ai_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email text NOT NULL,
  video_id uuid REFERENCES public.videos_ai(id) ON DELETE SET NULL,
  amount_paid numeric NOT NULL,
  payment_status text DEFAULT 'en_attente', -- en_attente, paye, echoue
  download_link_sent boolean DEFAULT false,
  stripe_session_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Pèmèt kreyasyon pou kliyan (Back-end pral fè sa avèk sèvis wòl men jis nan ka)
ALTER TABLE public.videos_ai_orders ENABLE ROW LEVEL SECURITY;

-- Reg pou insert itilize pa Edge Functions oswa api an jeneral
CREATE POLICY "Enable insert for authenticated users and anon via functions" ON public.videos_ai_orders
  FOR INSERT WITH CHECK (true);
