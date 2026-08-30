import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePhotoLive() {
    const { data, error } = await supabase
        .from('landing_config')
        .update({ ap_photo_url: 'https://files.catbox.moe/pybamu.jpg' })
        .eq('id', 1);

    if (error) {
        console.error('Erreur:', error);
    } else {
        console.log('Succès! L\'image en direct de Biduello a été mise à jour.');
    }
}

updatePhotoLive();
