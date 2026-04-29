const supabaseUrl = 'https://uvgntflbylfbdfszthsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Z250ZmxieWxmYmRmc3p0aHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgzNzU5NCwiZXhwIjoyMDkwNDEzNTk0fQ.K-kXEdNGAPAz8a9dIpMxZu8NwXFrIsLsROGjGWxPnTw';

const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

async function updateDB() {
    try {
        console.log("Suppression des anciens...");
        // URL for REST: /rest/v1/table
        await fetch(`${supabaseUrl}/rest/v1/temoignages?id=not.eq.00000000-0000-0000-0000-000000000000`, {
            method: 'DELETE',
            headers
        });

        console.log("Insertion des nouveaux...");
        const response = await fetch(`${supabaseUrl}/rest/v1/temoignages`, {
            method: 'POST',
            headers,
            body: JSON.stringify([
                { ordre: 1, nom: 'Wadline P.', service: 'Coaching', badge_resultat: '+40% vant nan 30 jou', citation: 'Aprè 1 mwa coaching, biznis mwen chanje nèt. DJ se yon ekspè vrèman!', avatar_url: 'assets/avatars/haitian_woman_1_1777075567329.png', actif: true },
                { ordre: 2, nom: 'Judson F.', service: 'Facebook Ads', badge_resultat: 'ROAS 5.1x', citation: 'Mwen depanse $200 reklam, mwen fè $1020 vant. Mèsi anpil!', avatar_url: 'assets/avatars/haitian_man_1_1777075578948.png', actif: true },
                { ordre: 3, nom: 'Dieula V.', service: 'TikTok Ads', badge_resultat: '10k followers nan 3 semèn', citation: 'TikTok mwen te mouri, kounye a li ap boule chak jou!', avatar_url: 'assets/avatars/haitian_woman_2_1777075589349.png', actif: true },
                { ordre: 4, nom: 'Marc-Arthur T.', service: 'Coaching Business', badge_resultat: '3x plis kliyan', citation: 'Estrateji DJ ba mwen an chanje tout bagay pou antrepriz mwen.', avatar_url: 'assets/avatars/haitian_man_2_1777075602573.png', actif: true },
                { ordre: 5, nom: 'Daphney J.', service: 'Facebook Ads', badge_resultat: '+65% trafik', citation: 'Kliyan ap rele mwen kounye a, mwen pa bezwen kouri dèyè yo ankò!', avatar_url: 'assets/avatars/haitian_woman_3_1777075617264.png', actif: true },
                { ordre: 6, nom: 'Woodensky C.', service: 'Coaching', badge_resultat: 'Lanse biznis nan 45 jou', citation: 'Mwen pa t konn kote pou kòmanse, DJ gide mwen pas-a-pas.', avatar_url: 'assets/avatars/haitian_man_3_1777075630903.png', actif: true }
            ])
        });
        
        if (!response.ok) {
            console.error("Erreur:", await response.text());
        } else {
            console.log("Succès!");
        }
    } catch (e) {
        console.error(e);
    }
}

updateDB();
