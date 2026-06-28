/**
 * Webhook para receber novas reservas de um SaaS externo ou do frontend.
 * Responsabilidade única: orquestrar o fluxo de uma reserva recebida.
 *
 * A lógica de negócio está distribuída nos serviços abaixo:
 *  - reservationSanitizer  → sanitização e validação de campos
 *  - reservationRepository → persistência no PostgreSQL
 *  - reservationNotifier   → notificações (Telegram, SaaS)
 */
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { sanitizeCustomer, getMissingFields } from '../services/reservationSanitizer';
import { saveReservation } from '../services/reservationRepository';
import { notifyTelegram, forwardToSaas } from '../services/reservationNotifier';

const router = express.Router();

// Limitador rígido para criações de reserva
const reservationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    message: { error: 'Muitas tentativas de reserva. Por favor, aguarde 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/', reservationLimiter, async (req: Request, res: Response): Promise<void> => {
    console.log('📥 Nova requisição recebida no Webhook:', req.body);

    const { internal_id, customer: rawCustomer, payment, flight } = req.body;

    // 1. Sanitização dos campos sensíveis do cliente
    const customer = sanitizeCustomer(rawCustomer ?? {});

    // 2. Validação dos campos obrigatórios
    const missing = getMissingFields(internal_id, customer, flight);
    if (missing.length > 0) {
        res.status(400).json({ error: 'Missing required fields', fields: missing });
        return;
    }

    // 3. Persistência no banco de dados (bloqueante — tratado com try/catch interno)
    try {
        await saveReservation(internal_id, customer, payment, flight);
    } catch (dbError) {
        // Non-fatal: loga mas não interrompe o fluxo (Telegram e SaaS ainda disparam)
        console.error('❌ Falha ao salvar a reserva no banco de dados:', dbError);
    }

    // 4. Notificações externas (fire-and-forget — não bloqueante)
    notifyTelegram(internal_id, customer, flight, payment);
    forwardToSaas(req.body, customer);

    res.status(200).json({ success: true, message: 'Reservation received successfully' });
});

export default router;
