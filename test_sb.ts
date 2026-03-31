import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.0';
const sb = createClient('https://uvgntflbylfbdfszthsa.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Z250ZmxieWxmYmRmc3p0aHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Mzc1OTQsImV4cCI6MjA5MDQxMzU5NH0.6ROSyoPIrMfF9hL9YOla_v1phAEPQ8Ck-hii_p_7a9A');
sb.functions.invoke('create-checkout-session', {body: {service_id:'81d2b027-1236-40d0-476a-4b69-a229-ca771e0b8f1e',prenom:'Jane',non:'Doe',email:'test@example.com',telephone:'123456',message:'',mode_paiement:'full',horaires:{'81d2b027-1236-40d0-476a-4b69-a229-ca771e0b8f1e_D0':['H8']},gateway:'moncash',pas_de_creneaux:false}})
  .then(res => console.log('SUPABASE JS RES:', JSON.stringify(res)))
  .catch(err => console.error('SUPABASE JS ERR:', err));
