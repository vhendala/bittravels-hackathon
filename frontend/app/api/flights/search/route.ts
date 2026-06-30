import { NextRequest, NextResponse } from 'next/server';

const AMADEUS_BASE_URL = 'https://test.api.amadeus.com/v2';
const COMMISSION_RATE = 1.10;
const MAX_OFFERS = 50;

// Token cache (per serverless instance)
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const clientId = process.env.AMADEUS_CLIENT_ID || process.env.AMADEUS_API_KEY;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET || process.env.AMADEUS_API_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Amadeus credentials not configured (AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET)');
    }

    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!res.ok) throw new Error(`Amadeus token error: ${res.status} ${res.statusText}`);

    const data = await res.json() as { access_token: string; expires_in: number };
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
}

function applyMarkup(offers: any[]): any[] {
    return offers.map(offer => {
        const o = JSON.parse(JSON.stringify(offer));
        if (o.price) {
            if (o.price.total) o.price.total = (parseFloat(o.price.total) * COMMISSION_RATE).toFixed(2);
            if (o.price.base) o.price.base = (parseFloat(o.price.base) * COMMISSION_RATE).toFixed(2);
            if (o.price.grandTotal) o.price.grandTotal = (parseFloat(o.price.grandTotal) * COMMISSION_RATE).toFixed(2);
        }
        if (Array.isArray(o.travelerPricings)) {
            o.travelerPricings.forEach((tp: any) => {
                if (tp.price?.total) tp.price.total = (parseFloat(tp.price.total) * COMMISSION_RATE).toFixed(2);
                if (tp.price?.base) tp.price.base = (parseFloat(tp.price.base) * COMMISSION_RATE).toFixed(2);
            });
        }
        return o;
    });
}

function parseChildrenAges(raw: unknown): number[] {
    if (!raw) return [];
    if (typeof raw === 'string') return raw.split(',').map(Number).filter(n => !isNaN(n));
    if (Array.isArray(raw)) return raw.map(Number).filter(n => !isNaN(n));
    return [];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { origin, destination, departureDate, returnDate, adults, childrenAges, max, segments, currency } = body;

        if (!segments?.length && (!origin || !destination || !departureDate)) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const token = await getToken();

        let adultsCount = parseInt(adults) || 1;
        let childrenCount = 0;
        let infantsCount = 0;
        const ages = parseChildrenAges(childrenAges);

        ages.forEach(age => {
            if (age < 2) infantsCount++;
            else if (age < 12) childrenCount++;
            else adultsCount++;
        });

        if (infantsCount > adultsCount) {
            return NextResponse.json({ error: `Número de bebês não pode exceder adultos` }, { status: 400 });
        }

        const travelers: any[] = [];
        const adultIds: string[] = [];

        for (let i = 0; i < adultsCount; i++) {
            const id = String(travelers.length + 1);
            travelers.push({ id, travelerType: 'ADULT' });
            adultIds.push(id);
        }
        for (let i = 0; i < childrenCount; i++) {
            travelers.push({ id: String(travelers.length + 1), travelerType: 'CHILD' });
        }
        for (let i = 0; i < infantsCount; i++) {
            travelers.push({ id: String(travelers.length + 1), travelerType: 'HELD_INFANT', associatedAdultId: adultIds[i] });
        }

        const originDestinations: any[] = [];

        if (segments?.length) {
            segments.forEach((seg: any, idx: number) => {
                originDestinations.push({
                    id: String(idx + 1),
                    originLocationCode: seg.origin.toUpperCase(),
                    destinationLocationCode: seg.destination.toUpperCase(),
                    departureDateTimeRange: { date: seg.date },
                });
            });
        } else {
            originDestinations.push({
                id: '1',
                originLocationCode: origin.toUpperCase(),
                destinationLocationCode: destination.toUpperCase(),
                departureDateTimeRange: { date: departureDate },
            });
            if (returnDate) {
                originDestinations.push({
                    id: '2',
                    originLocationCode: destination.toUpperCase(),
                    destinationLocationCode: origin.toUpperCase(),
                    departureDateTimeRange: { date: returnDate },
                });
            }
        }

        const requestBody = {
            currencyCode: currency || 'BRL',
            originDestinations,
            travelers,
            sources: ['GDS'],
            searchCriteria: {
                maxFlightOffers: max ? parseInt(max) : MAX_OFFERS,
                flightFilters: {
                    cabinRestrictions: [{
                        cabin: 'ECONOMY',
                        coverage: 'MOST_SEGMENTS',
                        originDestinationIds: originDestinations.map(od => od.id),
                    }],
                },
            },
        };

        const amadeusRes = await fetch(`${AMADEUS_BASE_URL}/shopping/flight-offers`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!amadeusRes.ok) {
            const errText = await amadeusRes.text();
            let errMsg = `Amadeus API error: ${amadeusRes.status}`;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.errors?.length) errMsg = errJson.errors.map((e: any) => e.detail || e.title).join('. ');
            } catch (_) { errMsg += ` - ${errText}`; }
            return NextResponse.json({ error: errMsg }, { status: amadeusRes.status });
        }

        const data = await amadeusRes.json() as { data: any[] };
        const flights = applyMarkup(data.data || []).sort(
            (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
        );

        return NextResponse.json({ success: true, count: flights.length, data: flights, cached: false });
    } catch (err) {
        console.error('[/api/flights/search]', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to search flights' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate');

    if (!origin || !destination || !departureDate) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Delegate to POST handler with equivalent body
    const syntheticRequest = new NextRequest(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            origin, destination, departureDate,
            returnDate: searchParams.get('returnDate'),
            adults: searchParams.get('adults') || '1',
            childrenAges: searchParams.get('childrenAges'),
            max: searchParams.get('max'),
            currency: searchParams.get('currency'),
        }),
    });

    return POST(syntheticRequest);
}
