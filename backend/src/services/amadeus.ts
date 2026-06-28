// Amadeus API Service
interface AmadeusTokenResponse {
    access_token: string;
    expires_in: number;
}

interface FlightOffer {
    id: string;
    price: {
        total: string;
        currency: string;
    };
    itineraries: Array<{
        duration: string;
        segments: Array<{
            departure: {
                iataCode: string;
                at: string;
            };
            arrival: {
                iataCode: string;
                at: string;
            };
            carrierCode: string;
            number: string;
            duration: string;
        }>;
    }>;
}

interface AmadeusFlightSearchResponse {
    data: FlightOffer[];
}

interface Traveler {
    id: string;
    travelerType: 'ADULT' | 'CHILD' | 'HELD_INFANT';
    associatedAdultId?: string;
}

interface TravelerPricing {
    travelerId: string;
    price: { total: string;[key: string]: unknown };
    [key: string]: unknown;
}

// Branded Fares: amenidade retornada por segmento
export interface BrandedFareAmenity {
    description: string;
    isChargeable: boolean;
    amenityType: string;
}

// Branded Fares: variante de tarifa retornada pelo upselling
export interface BrandedFareOffer {
    id: string;
    price: {
        total: string;
        currency: string;
    };
    // Nome da família tarifária (ex: "ECONOMY SAVER", "ECONOMY FLEX")
    fareDetailsBySegment?: Array<{
        fareBasis?: string;
        brandedFare?: string;
        brandedFareLabel?: string;
        includedCheckedBags?: { quantity: number };
        amenities?: BrandedFareAmenity[];
    }>;
}

interface AmadeusBrandedFaresResponse {
    data: FlightOffer[];
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

const AMADEUS_BASE_URL = 'https://test.api.amadeus.com/v2';
const COMMISSION_RATE = 1.10; // Margem de Lucro de +10%

// Amadeus limita resultados por segmento para evitar timeout na busca multi-city
const MAX_OFFERS_PER_SEGMENT = 20;

/**
 * Oculta o preço nativo e injeta a comissão da agência
 */
function applyMarkup(offers: any[]): any[] {
    return offers.map(offer => {
        const newOffer = JSON.parse(JSON.stringify(offer)); // Deep clone para não mutar RAM

        if (newOffer.price) {
            if (newOffer.price.total) newOffer.price.total = (parseFloat(newOffer.price.total) * COMMISSION_RATE).toFixed(2);
            if (newOffer.price.base) newOffer.price.base = (parseFloat(newOffer.price.base) * COMMISSION_RATE).toFixed(2);
            if (newOffer.price.grandTotal) newOffer.price.grandTotal = (parseFloat(newOffer.price.grandTotal) * COMMISSION_RATE).toFixed(2);
        }

        if (Array.isArray(newOffer.travelerPricings)) {
            newOffer.travelerPricings.forEach((tp: any) => {
                if (tp.price) {
                    if (tp.price.total) tp.price.total = (parseFloat(tp.price.total) * COMMISSION_RATE).toFixed(2);
                    if (tp.price.base) tp.price.base = (parseFloat(tp.price.base) * COMMISSION_RATE).toFixed(2);
                }
            });
        }

        return newOffer;
    });
}

/**
 * Get Amadeus API access token (cached)
 */
export async function getAmadeusToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Amadeus API credentials not configured');
    }

    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get Amadeus token: ${response.statusText}`);
    }

    const data = await response.json() as AmadeusTokenResponse;

    // Subtrai 60s de margem para evitar uso de token expirado
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return cachedToken;
}

/**
 * Search for flights using Amadeus API
 * Supports one-way, round-trip, and combinatorial multi-city via POST
 */
export async function searchFlights(params: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    segments?: Array<{ origin: string; destination: string; date: string }>;
    adults?: number;
    childrenAges?: number[];
    max?: number;
    currency?: string;
}): Promise<FlightOffer[]> {
    const token = await getAmadeusToken();

    let adultsCount = params.adults || 1;
    let childrenCount = 0;
    let infantsCount = 0;

    // Categorize children based on age
    if (params.childrenAges && params.childrenAges.length > 0) {
        params.childrenAges.forEach(age => {
            if (age < 2) {
                infantsCount++;
            } else if (age >= 2 && age < 12) {
                childrenCount++;
            } else {
                adultsCount++;
            }
        });
    }

    if (infantsCount > adultsCount) {
        throw new Error(`Número de bebês (${infantsCount}) não pode exceder o número de adultos (${adultsCount}).`);
    }

    const travelers: Traveler[] = [];
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
        travelers.push({
            id: String(travelers.length + 1),
            travelerType: 'HELD_INFANT',
            associatedAdultId: adultIds[i]
        });
    }

    const originDestinations: any[] = [];

    // If multi-city: use Amadeus native support by providing multiple originDestinations
    if (params.segments && params.segments.length > 0) {
        console.log(`[Amadeus] Native multi-city search for ${params.segments.length} segments`);
        params.segments.forEach((seg, index) => {
            originDestinations.push({
                id: String(index + 1),
                originLocationCode: seg.origin.toUpperCase(),
                destinationLocationCode: seg.destination.toUpperCase(),
                departureDateTimeRange: { date: seg.date }
            });
        });
    } 
    // Default One-way or Round-trip
    else if (params.origin && params.destination && params.departureDate) {
        originDestinations.push({
            id: "1",
            originLocationCode: params.origin.toUpperCase(),
            destinationLocationCode: params.destination.toUpperCase(),
            departureDateTimeRange: { date: params.departureDate }
        });

        if (params.returnDate) {
            originDestinations.push({
                id: "2",
                originLocationCode: params.destination.toUpperCase(),
                destinationLocationCode: params.origin.toUpperCase(),
                departureDateTimeRange: { date: params.returnDate }
            });
        }
    } else {
        throw new Error('Missing search parameters');
    }

    const requestBody = {
        currencyCode: params.currency || 'BRL',
        originDestinations,
        travelers,
        sources: ['GDS'],
        searchCriteria: {
            maxFlightOffers: params.max || 50,
            flightFilters: {
                cabinRestrictions: [{
                    cabin: 'ECONOMY',
                    coverage: 'MOST_SEGMENTS',
                    originDestinationIds: originDestinations.map(od => od.id)
                }]
            }
        }
    };

    const response = await fetch(`${AMADEUS_BASE_URL}/shopping/flight-offers`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Amadeus] Flight search error: ${response.status} - ${errorText}`);
        let errorMessage = `Amadeus API error: ${response.status}`;
        try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.errors && errorJson.errors.length > 0) {
                errorMessage = errorJson.errors.map((e: { detail?: string; title?: string }) => e.detail || e.title).join('. ');
            }
        } catch (parseError) {
            console.warn('[Amadeus] Could not parse error response as JSON:', parseError);
            errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json() as AmadeusFlightSearchResponse;
    const rawFlights = data.data || [];
    const flights = applyMarkup(rawFlights);

    return flights.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
}

const AMADEUS_V1_BASE_URL = 'https://test.api.amadeus.com/v1';

/**
 * Busca tarifas reais (branded fares) para um voo específico.
 * Usa o endpoint de Upsell do Amadeus, que retorna as famílias tarifárias
 * disponíveis (ex: Economy Saver, Economy Flex) com seus respectivos
 * serviços incluídos (bagagem, reembolso, seleção de assento).
 *
 * Retorna array vazio se a companhia não suportar branded fares.
 */
export async function getBrandedFares(flightOffer: unknown): Promise<FlightOffer[]> {
    const token = await getAmadeusToken();

    const response = await fetch(`${AMADEUS_V1_BASE_URL}/shopping/flight-offers/upselling`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: {
                type: 'flight-offers-upselling',
                flightOffers: [flightOffer]
            }
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Amadeus] Branded fares not available: ${response.status} - ${errorText}`);
        // Retorna vazio para triggerar o fallback no frontend
        return [];
    }

    const data = await response.json() as AmadeusBrandedFaresResponse;
    const rawFares = data.data || [];
    const fares = applyMarkup(rawFares);

    return fares.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
}

/**
 * Search for airport and city locations using Amadeus API
 */
export async function searchLocations(keyword: string): Promise<any[]> {
    const token = await getAmadeusToken();

    const searchParams = new URLSearchParams({
        keyword,
        subType: 'AIRPORT,CITY',
        'page[limit]': '10', // Get up to 10 results
    });

    const url = `https://test.api.amadeus.com/v1/reference-data/locations?${searchParams}`;
    console.log(`[Amadeus] Searching locations with keyword: "${keyword}"`);
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Amadeus] Location search error: ${response.status} - ${errorText}`);
        throw new Error(`Amadeus API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { data: any[] };
    console.log(`[Amadeus] Found ${data.data?.length || 0} locations for "${keyword}"`);
    return data.data || [];
}

