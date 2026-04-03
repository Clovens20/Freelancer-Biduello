-- Add columns for abandoned checkout recovery
alter table if exists public.reservations 
add column if not exists checkout_url text,
add column if not exists last_reminder_at timestamp with time zone,
add column if not exists reminder_count int default 0;

-- Active extension cron si disponib
create extension if not exists pg_cron;

-- Job pou kouri chak lè (60 minit)
-- Sa ap rele Edge Function send-abandonment-reminders
select cron.schedule(
    'abandoned-checkout-recovery',
    '0 * * * *', -- Chak lè
    $$
    select
      net.http_post(
        url:='https://uvgntflbylfbdfszthsa.supabase.co/functions/v1/send-abandonment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
);
