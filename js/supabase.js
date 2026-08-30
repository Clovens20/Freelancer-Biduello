/**
 * DJ Innovations — Supabase Config
 * Connexion au nouveau projet : uvgntflbylfbdfszthsa
 */

const supabaseUrl = 'https://rwspouckgvdmdxhswfsp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3c3BvdWNrZ3ZkbWR4aHN3ZnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzM5NTcsImV4cCI6MjEwMzYwOTk1N30.MefB-MqkOGBETG8Q6e6CVBlkzFiZG5kqssCoJwj6atU';

// Initialisation globale avec le schéma par défaut 'public'
const { createClient } = supabase;
const _sb = createClient(supabaseUrl, supabaseKey);

// Partage du client avec le reste de l'application
window.supabaseClient = _sb;

console.log('✅ Supabase connecté au nouveau projet (Schéma: public)');