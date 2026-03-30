const STRIPE_PUBLISHABLE_KEY = ''; // Kle Stripe ou (pk_test_...)

async function startStripeCheckout(reservationData) {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: reservationData
    });

    if (error) {
        console.error('Erè Stripe:', error);
        alert('Gen yon erè ki fèt pandan n ap kontakte Stripe. Tanpri eseye ankò.');
        return;
    }

    if (data && data.url) {
        // Redirije kliyan an nan Stripe Checkout
        window.location.href = data.url;
    } else {
        alert('Nou pa t kapab jwenn lyen peman an. Tcheke si Edge Functions yo byen konfigure.');
    }
}
