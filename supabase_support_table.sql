-- ═══════════════════════════════════════════════════════════════════
-- DJ INNOVATIONS — TABLE POUR MESSAGES DE SUPPORT
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut envoyer un message (insertion)
CREATE POLICY "Allow anonymous insert support_messages" ON public.support_messages
    FOR INSERT WITH CHECK (true);

-- Seul l'administrateur (freelancer authentifié) peut voir et modifier les messages
CREATE POLICY "Allow admin select support_messages" ON public.support_messages
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admin update support_messages" ON public.support_messages
    FOR UPDATE USING (auth.uid() IS NOT NULL);
