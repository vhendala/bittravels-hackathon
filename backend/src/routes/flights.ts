import { Router, Request, Response } from 'express';
import { searchFlights } from '../services/amadeus';
import rateLimit from 'express-rate-limit';

import crypto from 'crypto';

const router = Router();

// Cache em memória p/ salvar o faturamento da API (TTL: 15min)
interface CacheEntry {
    timestamp: number;
    data: any;
}
const flightCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function generateCacheKey(params: any): string {
    // Ordena as chaves garantindo consistencia
    const sortedString = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('md5').update(sortedString).digest('hex');
}

// Limitador específico para buscas de voos
const searchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // Limite de 50 requests por IP
    message: { error: "Muitas buscas realizadas. Por favor, aguarde alguns minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Normaliza o campo childrenAges que pode vir como string CSV ou array de números.
 * Isso acontece porque dados enviados via query string chegam como string.
 */
function parseChildrenAges(childrenAges: unknown): number[] {
    if (!childrenAges) return [];
    if (typeof childrenAges === 'string') {
        return childrenAges.split(',').map(Number);
    }
    if (Array.isArray(childrenAges)) {
        return childrenAges.map(Number);
    }
    return [];
}

/**
 * POST /api/flights/search
 * Search for flights (supports multi-city)
 */
router.post('/search', searchLimiter, async (req: Request, res: Response) => {
    console.log('🔍 [POST /api/flights/search] Requisição recebida');
    try {
        const { origin, destination, departureDate, returnDate, adults, childrenAges, max, segments, currency } = req.body;

        // If simple search (no segments provided), validate basic params
        if (!segments || segments.length === 0) {
            if (!origin || !destination || !departureDate) {
                return res.status(400).json({
                    error: 'Missing required parameters: origin, destination, departureDate, or segments',
                });
            }
        }

        const searchConfig = {
            origin: origin ? (origin as string).toUpperCase() : undefined,
            destination: destination ? (destination as string).toUpperCase() : undefined,
            departureDate: departureDate as string | undefined,
            returnDate: returnDate as string | undefined,
            segments: segments || [],
            adults: adults ? parseInt(adults as string) : 1,
            childrenAges: parseChildrenAges(childrenAges),
            max: max ? parseInt(max as string) : 50,
            currency: currency as string | undefined,
        };

        const cacheKey = `POST_${generateCacheKey(searchConfig)}`;
        const cachedItem = flightCache.get(cacheKey);

        if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL_MS)) {
            console.log(`⚡ [Cache Hit] Voos retornados em < 20ms da Memória RAM (Chave: ${cacheKey.substring(0, 8)})`);
            return res.json({
                success: true,
                count: cachedItem.data.length,
                data: cachedItem.data,
                cached: true
            });
        }



        const flights = await searchFlights(searchConfig);

        // Salva na memória
        flightCache.set(cacheKey, { timestamp: Date.now(), data: flights });

        return res.json({
            success: true,
            count: flights.length,
            data: flights,
            cached: false
        });
    } catch (error) {
        console.error('Flight search error:', error);

        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to search flights',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * GET /api/flights/search
 * Search for flights (backward compatibility)
 */
router.get('/search', searchLimiter, async (req: Request, res: Response) => {
    console.log('🔍 [GET /api/flights/search] Requisição recebida');
    try {
        const { origin, destination, departureDate, returnDate, adults, childrenAges, max, currency } = req.query;

        // Validate required parameters
        if (!origin || !destination || !departureDate) {
            return res.status(400).json({
                error: 'Missing required parameters: origin, destination, departureDate',
            });
        }

        const searchConfig = {
            origin: (origin as string).toUpperCase(),
            destination: (destination as string).toUpperCase(),
            departureDate: departureDate as string,
            returnDate: returnDate as string | undefined,
            adults: adults ? parseInt(adults as string) : 1,
            childrenAges: parseChildrenAges(childrenAges),
            max: max ? parseInt(max as string) : 50,
            currency: currency as string | undefined,
        };

        const cacheKey = `GET_${generateCacheKey(searchConfig)}`;
        const cachedItem = flightCache.get(cacheKey);

        if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL_MS)) {
            console.log(`⚡ [Cache Hit] Voos retornados em < 20ms da Memória RAM (Chave: ${cacheKey.substring(0, 8)})`);
            return res.json({
                success: true,
                count: cachedItem.data.length,
                data: cachedItem.data,
                cached: true
            });
        }



        const flights = await searchFlights(searchConfig);
        
        // Salva na memória
        flightCache.set(cacheKey, { timestamp: Date.now(), data: flights });

        return res.json({
            success: true,
            count: flights.length,
            data: flights,
            cached: false
        });
    } catch (error) {
        console.error('Flight search error:', error);

        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to search flights',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
