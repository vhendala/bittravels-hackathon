import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db';

const router = Router();

// Zod Schema robusto blindando a API de Crashes de leitura nula (DoS)
const bookingSchema = z.object({
    flight: z.object({
        price: z.object({
            total: z.string().or(z.number()),
            currency: z.string()
        }).passthrough(),
        itineraries: z.array(z.object({
            segments: z.array(z.object({
                departure: z.object({ iataCode: z.string() }).passthrough(),
                arrival: z.object({ iataCode: z.string() }).passthrough()
            }).passthrough()).min(1)
        }).passthrough()).min(1)
    }).passthrough(),
    passengers: z.object({
        adults: z.array(z.any()),
        children: z.array(z.any()).optional().nullable(),
        babies: z.array(z.any()).optional().nullable()
    }).passthrough(),
    contact: z.any(),
    payment: z.any()
});

/**
 * Create a new booking
 * POST /api/bookings
 */
router.post('/', async (req: Request, res: Response) => {
    const parseResult = bookingSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({
            error: 'Missing or Invalid fields',
            message: 'Payload de reserva mal formatado ou campos vitais ausentes ou nulos.',
            details: parseResult.error.issues,
        });
    }

    const { flight, passengers, contact, payment } = parseResult.data;
    const bookingId = `BT${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
        await pool.query(
            `INSERT INTO bookings
                (booking_id, status, total_price, currency, flight_data, passengers, contact, payment)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                bookingId,
                'PENDING',
                String(flight.price.total),
                flight.price.currency,
                JSON.stringify(flight),
                JSON.stringify(passengers),
                JSON.stringify(contact),
                JSON.stringify(payment),
            ]
        );

        console.log(`✅ New booking persisted to DB: ${bookingId}`);

        return res.status(201).json({
            success: true,
            bookingId,
            status: 'PENDING',
            message: 'Booking created successfully',
            booking: {
                bookingId,
                status: 'PENDING',
                totalPrice: String(flight.price.total),
                currency: flight.price.currency,
                createdAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({
            error: 'Failed to create booking',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
});

/**
 * Get booking by ID
 * GET /api/bookings/:bookingId
 */
router.get('/:bookingId', async (req: Request, res: Response) => {
    const { bookingId } = req.params;

    try {
        const { rows } = await pool.query(
            'SELECT * FROM bookings WHERE booking_id = $1',
            [bookingId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: 'Booking not found',
                message: `No booking found with ID: ${bookingId}`,
            });
        }

        return res.json({ success: true, booking: rows[0] });
    } catch (error) {
        console.error('Error retrieving booking:', error);
        return res.status(500).json({
            error: 'Failed to retrieve booking',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
});

/**
 * Get all bookings (admin only)
 * GET /api/bookings
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM bookings ORDER BY created_at DESC'
        );

        return res.json({ success: true, count: rows.length, bookings: rows });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        return res.status(500).json({
            error: 'Failed to retrieve bookings',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    }
});

export default router;
