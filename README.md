# DJ Innovations - Portal Sèvis & Peman

Sa se fichye konfigirasyon pou pwojè w la.

## Sa w dwe fè:

1.  **Supabase:**
    *   Kreye yon nouvo pwojè sou [supabase.com](https://supabase.com).
    *   Kopi kontni ki nan `supabase_setup.sql` epi kouri l nan "SQL Editor" Supabase la.
    *   Nan Dashboard Supabase la, ale nan **Project Settings > API** pou jwenn `URL` ak `Anon Key` ou.
    *   Mete yo nan fichye `.env` (itilize `.env.example` kòm modèl).

2.  **Edge Functions:**
    *   Enstale Supabase CLI.
    *   Kouri `supabase functions deploy create-checkout-session`.
    *   Kouri `supabase functions deploy stripe-webhook`.
    *   Kouri `supabase functions deploy send-confirmation-email`.

3.  **Stripe:**
    *   Kontakte [stripe.com](https://stripe.com) pou jwenn kle API w yo (`Secret Key` ak `Publishable Key`).
    *   Mete sekrè yo nan Supabase Edge Functions:
        ```bash
        supabase secrets set STRIPE_SECRET_KEY=sk_test_...
        supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
        supabase secrets set RESEND_API_KEY=re_...
        supabase secrets set FORMATEUR_EMAIL=email@djinnovations.com
        ```

4.  **Resend:**
    *   Kreye yon kont sou [resend.com](https://resend.com) pou voye imèl yo.
    *   Jwenn API Key ou epi mete l nan sekrè Supabase yo.

## Estrikti Pwojè a:
- `index.html`: Paj prensipal la.
- `css/style.css`: Tout bèl aparans paj la.
- `js/app.js`: Lojik pou chanje etap yo ak kontwole fòm lan.
- `js/supabase.js`: Koneksyon ak baz done w la.
- `js/stripe.js`: Koneksyon ak Stripe Checkout.
