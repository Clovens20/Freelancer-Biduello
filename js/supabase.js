/**
 * DJ Innovations — Supabase Config
 * Connexion au nouveau projet : uvgntflbylfbdfszthsa
 */

const supabaseUrl = 'https://uvgntflbylfbdfszthsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Z250ZmxieWxmYmRmc3p0aHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mzc1OTQsImV4cCI6MjA5MDQxMzU5NH0.6ROSyoPIrMfF9hL9YOla_v1phAEPQ8Ck-hii_p_7a9A';

// Initialisation globale avec le schéma par défaut 'public'
const { createClient } = supabase;
const _sb = createClient(supabaseUrl, supabaseKey);

// Partage du client avec le reste de l'application
window.supabaseClient = _sb;

console.log('✅ Supabase connecté au nouveau projet (Schéma: public)');