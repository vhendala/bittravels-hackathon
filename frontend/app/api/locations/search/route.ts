import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

interface Airport {
    icao: string;
    iata: string;
    name: string;
    city: string;
    state: string;
    country: string;
    elevation: number;
    lat: number;
    lon: number;
    tz: string;
}

interface AirportResult {
    iataCode: string;
    name: string;
    cityName: string;
    countryName: string;
    type: 'AIRPORT';
}

// Load and parse airports data once at module init (cached by Node/Vercel)
let airportsCache: AirportResult[] | null = null;

function getAirports(): AirportResult[] {
    if (airportsCache) return airportsCache;

    try {
        const filePath = path.join(process.cwd(), 'public', 'airports.json');
        const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, Airport>;

        airportsCache = Object.values(raw)
            .filter((a) => a.iata && a.iata.trim() !== '')
            .map((a) => ({
                iataCode: a.iata.trim().toUpperCase(),
                name: a.name,
                cityName: a.city,
                countryName: a.country,
                type: 'AIRPORT' as const,
            }));
    } catch (err) {
        console.error('[locations/search] Failed to load airports.json:', err);
        airportsCache = [];
    }

    return airportsCache;
}

function searchAirports(q: string, limit = 15): AirportResult[] {
    if (!q || q.length < 2) return [];

    const query = q.toLowerCase();
    const airports = getAirports();
    const results: AirportResult[] = [];

    for (const airport of airports) {
        const isIataMatch = airport.iataCode.toLowerCase() === query;
        const isPartialMatch =
            airport.iataCode.toLowerCase().includes(query) ||
            airport.cityName.toLowerCase().includes(query) ||
            airport.name.toLowerCase().includes(query);

        if (isIataMatch || isPartialMatch) {
            if (isIataMatch) {
                results.unshift(airport);
            } else {
                results.push(airport);
            }
            if (results.length >= limit * 2) break;
        }
    }

    return results.slice(0, limit);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (q.length < 2) {
        return NextResponse.json({ data: [] });
    }

    const results = searchAirports(q.trim());
    return NextResponse.json({ data: results });
}
