import { Router, Request, Response } from 'express';
import { z } from 'zod'; // Validador de esquemas e sanitização rigorosa
import { searchLocations, getAmadeusToken } from '../services/amadeus';
import { searchLocalAirports, airportsData } from '../data/airports-local';
const router = Router();

/**
 * GET /api/locations/search?q=medel
 *
 * Busca de aeroportos em múltiplas fontes, por ordem de prioridade:
 * 1. Base local (airports.json em RAM) — resposta em milissegundos, zero custo de API
 * 2. Amadeus API — complementa com resultados que a base local possa não ter
 *
 * Parâmetro: q (mínimo 2 caracteres)
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const parseResult = z.object({ 
            q: z.string().trim().min(2).max(100) 
        }).safeParse(req.query);

        // Validação Estrita/Tipada: Falha de contrato genérica ou tipo perigoso barrado (Ex: Array Inj)
        if (!parseResult.success) {
            return res.json({ data: [] });
        }

        const { q } = parseResult.data;

        // 1. Busca ultrarrápida na base local em memória
        const localResults = searchLocalAirports(q);

        const combined = localResults.slice(0, 15);

        res.json({ data: combined });
    } catch (error) {
        console.error('Location search error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to search locations'
        });
    }
});

/**
 * GET /api/locations/resolve
 * Resolve a list of IATA codes to their full names (City, Country)
 * Query: ?iatas=GRU,MIA,JFK
 */
router.get('/resolve', async (req: Request, res: Response) => {
    try {
        const parseResult = z.object({ 
            iatas: z.string().trim().min(3).max(2000) 
        }).safeParse(req.query);

        if (!parseResult.success) {
            return res.json({ data: {} });
        }

        const codes = parseResult.data.iatas.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length === 0) {
            return res.json({ data: {} });
        }

        const result: Record<string, { cityName?: string; countryName?: string }> = {};

        // Convert files to maps for O(1) lookups
        const buildMap = (arr: any[]) => {
            for (const item of arr) {
                // If the code is not in result, or if this item is a CITY type (prioritize over AIRPORT if multiple entries)
                if (!result[item.iataCode] || item.type === 'CITY') {
                    result[item.iataCode] = {
                        cityName: item.cityName || item.name,
                        countryName: item.countryName,
                    };
                }
            }
        };

        // Resolve IATAs directly from the local in-memory database (O(n) but n ~ 10k filtered airports)
        const filteredLocal = airportsData.filter((a: { iataCode: string }) => codes.includes(a.iataCode));
        buildMap(filteredLocal);

        // Find which codes were not found in local db
        const missingCodes = codes.filter(code => !result[code]);

        if (missingCodes.length > 0) {
            try {
                const token = await getAmadeusToken();

                // Fetch missing IATA codes from Amadeus API
                const promises = missingCodes.map(async (code) => {
                    const url = `https://test.api.amadeus.com/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${code}`;
                    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) return;
                    const data = await res.json() as { data?: any[] };
                    if (data.data && data.data.length > 0) {
                        // Prioritize CITY over AIRPORT, otherwise take first
                        let bestMatch = data.data.find((d: any) => d.subType === 'CITY') || data.data[0];
                        if (bestMatch) {
                            result[code] = {
                                cityName: bestMatch.address?.cityName || bestMatch.name,
                                countryName: bestMatch.address?.countryName,
                            };
                        }
                    }
                });

                await Promise.all(promises);
            } catch (err) {
                console.error('[Locations] Error fetching missing IATAs from Amadeus:', err);
            }
        }

        res.json({ data: result });
    } catch (error) {
        console.error('Location resolve error:', error);
        res.status(500).json({ error: 'Failed to resolve locations' });
    }
});

export default router;

