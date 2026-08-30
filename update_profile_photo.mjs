import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.+)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateProfilePhoto() {
    const { data, error } = await supabase
        .from('freelancers')
        .update({ photo_url: '../assets/biduello.jpg' })
        .eq('id', '293b7841-9895-4d73-954e-e3ce044b4e88');

    if (error) {
        console.error('Erreur:', error);
    } else {
        console.log('Succès! L\'image a été ajoutée au profil de Biduello.');
    }
}

updateProfilePhoto();
