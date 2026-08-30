import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdmin() {
    const { data, error } = await supabase.from('freelancers').upsert([{
        id: '293b7841-9895-4d73-954e-e3ce044b4e88',
        email: 'dieujustebiduello@gmail.com',
        nom: 'Biduello Dieujuste',
        domaine: 'marketing',
        actif: true,
        discount_percent: 10
    }]);

    if (error) {
        console.error('Erreur:', error);
    } else {
        console.log('Succès! Biduello a été ajouté comme admin full access dans la table freelancers.');
    }
}

setAdmin();
