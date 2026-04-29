const supabaseUrl = 'https://uvgntflbylfbdfszthsa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Z250ZmxieWxmYmRmc3p0aHNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgzNzU5NCwiZXhwIjoyMDkwNDEzNTk0fQ.K-kXEdNGAPAz8a9dIpMxZu8NwXFrIsLsROGjGWxPnTw';

const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
};

async function addColumns() {
    try {
        const query = `
            ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_tag TEXT DEFAULT '✦ Pòtfolyo nou yo';
            ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_title TEXT DEFAULT 'Kanpay ki Fè Rezilta';
            ALTER TABLE landing_config ADD COLUMN IF NOT EXISTS portfolio_subtitle TEXT DEFAULT 'Gade kèk egzanp kanpay piblisite reyèl nou te jere pou kliyan nou yo.';
        `;
        
        // Supabase REST API ne permet pas d'exécuter des requêtes SQL brutes directement (sauf via RPC).
        // On va donc dire à l'utilisateur qu'il doit exécuter ceci dans Supabase, 
        // OU BIEN, on ne s'en soucie pas car si les colonnes n'existent pas, update le JSONB à la place ?
        // Non, landing_config n'est qu'une seule ligne. Il est préférable de dire à l'utilisateur de l'exécuter,
        // ou d'utiliser le endpoint RPC s'il en a un. 
        console.log("Les colonnes doivent être ajoutées via SQL Editor.");
    } catch (e) {
        console.error(e);
    }
}
addColumns();
