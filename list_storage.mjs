import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.+)/)?.[1] || 'https://uvgntflbylfbdfszthsa.supabase.co';
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) { console.error('Bucket error:', bErr); return; }
  console.log('Buckets:', buckets.map(b => b.name));
  
  for (const b of buckets) {
    const { data: files, error: fErr } = await supabase.storage.from(b.name).list();
    if (fErr) { console.error('Error listing files in', b.name, fErr); continue; }
    console.log('Files in', b.name, ':', files.map(f => f.name));
  }
}

list();
