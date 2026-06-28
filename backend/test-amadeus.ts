import dotenv from 'dotenv';

// Carrega o .env do backend
dotenv.config();

const CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

async function testAuth() {
    console.log('\n=== 1. Testando autenticação ===');
    console.log(`Client ID: ${CLIENT_ID ? CLIENT_ID.substring(0, 6) + '...' : '❌ NÃO CONFIGURADO'}`);
    console.log(`Client Secret: ${CLIENT_SECRET ? CLIENT_SECRET.substring(0, 4) + '...' : '❌ NÃO CONFIGURADO'}`);

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('\n❌ Credenciais ausentes no .env');
        process.exit(1);
    }

    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }),
    });

    const body = await res.json();

    if (!res.ok) {
        console.error('\n❌ Falha na autenticação:');
        console.error(JSON.stringify(body, null, 2));
        process.exit(1);
    }

    console.log(`\n✅ Token obtido com sucesso! Expira em ${body.expires_in}s`);
    return body.access_token as string;
}

async function testFlightSearch(token: string) {
    console.log('\n=== 2. Buscando voos GRU → MIA em 2025-12-01 ===');

    const params = new URLSearchParams({
        originLocationCode: 'GRU',
        destinationLocationCode: 'MIA',
        departureDate: '2025-12-01',
        adults: '1',
        max: '3',
        currencyCode: 'BRL',
    });

    const res = await fetch(
        `https://test.api.amadeus.com/v1/shopping/flight-offers?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const body = await res.json();

    if (!res.ok) {
        console.error('\n❌ Erro na busca de voos:');
        console.error(JSON.stringify(body, null, 2));
        process.exit(1);
    }

    const offers = body.data || [];
    if (offers.length === 0) {
        console.warn('\n⚠️  API funcionou mas não retornou voos para essa rota/data.');
    } else {
        console.log(`\n✅ ${offers.length} oferta(s) encontrada(s)!`);
        const first = offers[0];
        console.log(`   ✈  Preço: ${first.price.total} ${first.price.currency}`);
    }
}

(async () => {
    try {
        const token = await testAuth();
        await testFlightSearch(token);
        console.log('\n✅ API Amadeus funcionando corretamente!\n');
    } catch (err) {
        console.error('\n❌ Erro inesperado:', err);
        process.exit(1);
    }
})();
