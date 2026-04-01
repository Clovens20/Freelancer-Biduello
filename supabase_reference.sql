-- ═══════════════════════════════════════════════════════════════════
-- DJ INNOVATIONS — SQL RÉFÉRENCE (Schéma: PUBLIC)
-- Supabase Project: uvgntflbylfbdfszthsa
-- ⚠️  TOUJOURS utiliser "public.reservations" dans le SQL Editor
--      Le fichier supabase_setup.sql (nouveauprojet) est OBSOLÈTE
-- ═══════════════════════════════════════════════════════════════════

-- ── DIAGNOSTIC RAPIDE ──────────────────────────────────────────────
-- Voir toutes les réservations
SELECT id, prenom, email, statut, montant_total, created_at 
FROM public.reservations 
ORDER BY created_at DESC;

-- Compter par statut
SELECT statut, COUNT(*) as total 
FROM public.reservations 
GROUP BY statut;

-- ── NETTOYAGE ──────────────────────────────────────────────────────
-- Supprimer les réservations abandonnées (en_attente depuis +24h)
DELETE FROM public.reservations 
WHERE statut = 'en_attente' 
AND created_at < NOW() - INTERVAL '24 hours';

-- ── CORRECTIONS STATUT ─────────────────────────────────────────────
-- Normaliser tous les statuts payés vers 'paye' (sans accent)
UPDATE public.reservations
SET statut = 'paye'
WHERE statut IN ('payé', 'paid', 'Payé', 'PAYE');

-- Vérifier après normalisation
SELECT statut, COUNT(*) FROM public.reservations GROUP BY statut;

-- ── POLITIQUE RLS (si nécessaire) ──────────────────────────────────
-- Permettre la lecture publique des réservations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reservations' AND policyname = 'Allow all select'
  ) THEN
    CREATE POLICY "Allow all select" ON public.reservations FOR SELECT USING (true);
  END IF;
END $$;

-- Permettre la mise à jour (pour les webhooks Stripe/Bazik)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reservations' AND policyname = 'Allow all update'
  ) THEN
    CREATE POLICY "Allow all update" ON public.reservations FOR UPDATE USING (true);
  END IF;
END $$;

-- ✅ IMPORTANT: Permettre aux freelancers authentifiés de GÉRER les services
-- Sans ces politiques, INSERT/UPDATE/DELETE sur services sont bloqués!
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Freelancer ka ajoute sevis') THEN
    CREATE POLICY "Freelancer ka ajoute sevis" ON public.services 
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Freelancer ka modifye sevis') THEN
    CREATE POLICY "Freelancer ka modifye sevis" ON public.services 
    FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Freelancer ka efase sevis') THEN
    CREATE POLICY "Freelancer ka efase sevis" ON public.services 
    FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ✅ Permettre au freelancer de mettre à jour son profil (rabais, etc.)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'freelancers' AND policyname = 'Freelancer ka modifye profil li') THEN
    CREATE POLICY "Freelancer ka modifye profil li" ON public.freelancers 
    FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ── VÉRIFIER LES TABLES EXISTANTES ────────────────────────────────
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('reservations', 'services', 'freelancers')
ORDER BY table_schema, table_name;

-- ── STRUCTURE RESERVATIONS ─────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'reservations'
ORDER BY ordinal_position;
