/**
 * Migration: Create bookings table in PostgreSQL Neon
 * Run once: npx ts-node src/scripts/migrate_bookings.ts
 */
import pool from '../db';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id          SERIAL PRIMARY KEY,
                booking_id  TEXT        NOT NULL UNIQUE,
                status      TEXT        NOT NULL DEFAULT 'PENDING',
                total_price TEXT        NOT NULL,
                currency    TEXT        NOT NULL,
                flight_data JSONB       NOT NULL,
                passengers  JSONB       NOT NULL,
                contact     JSONB       NOT NULL,
                payment     JSONB       NOT NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ Tabela bookings criada (ou já existia).');
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((err) => {
    console.error('❌ Falha na migração:', err);
    process.exit(1);
});
