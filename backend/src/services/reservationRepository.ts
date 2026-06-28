/**
 * Persiste uma reserva no banco de dados PostgreSQL Neon.
 * Responsabilidade única: escrita no banco.
 */
import pool from '../db';
import { SanitizedCustomer } from './reservationSanitizer';

export async function saveReservation(
    internal_id: string,
    customer: SanitizedCustomer,
    payment: Record<string, unknown>,
    flight: Record<string, unknown>
): Promise<void> {
    const query = `
        INSERT INTO agency_reservations (
            internal_id, first_name, last_name, country, passport, cpf,
            birth_date, gender, email, whatsapp_phone, payment_method,
            flight_data, status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
    `;

    const values = [
        internal_id,
        customer.first_name,
        customer.last_name,
        customer.country,
        customer.passport,
        customer.cpf,
        customer.birth_date,
        customer.gender,
        customer.email,
        customer.whatsapp_phone,
        payment.payment_method,
        flight,
        'pending',
    ];

    await pool.query(query, values);
    console.log('✅ Reserva salva com sucesso no PostgreSQL Neon!');
}
