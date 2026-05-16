
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.0';

const supabaseUrl = 'https://uvgntflbylfbdfszthsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Z250ZmxieWxmYmRmc3p0aHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mzc1OTQsImV4cCI6MjA5MDQxMzU5NH0.6ROSyoPIrMfF9hL9YOla_v1phAEPQ8Ck-hii_p_7a9A';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentReservations() {
    const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching reservations:', error);
        return;
    }

    console.log('--- Dènye Rezèvasyon yo ---');
    data.forEach(r => {
        console.log(`ID: ${r.id} | Non: ${r.prenom} ${r.nom} | Statut: ${r.statut} | Dat: ${r.created_at} | Erè: ${r.error_log || 'Ok'}`);
    });
}

checkRecentReservations();
