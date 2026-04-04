-- Kreye tabl pou swiv trafik la
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    page TEXT DEFAULT 'home',
    visitor_id TEXT -- Opsyonèl: pou nou ka konnen si se menm moun nan (nou pral sèvi ak yon ID nan localStorage)
);

-- Pèmèt piblik la mete done (INSERT) men pa li yo (SELECT)
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pèmèt insert pou tout moun" ON public.site_visits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Se sèlman admin ki ka li statistik yo" ON public.site_visits
    FOR SELECT USING (auth.role() = 'authenticated');
