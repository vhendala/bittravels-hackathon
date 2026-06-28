const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_fO37MdcWaTYE@ep-flat-dream-ajbg1l4t.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function run() {
    try {
        await client.connect();

        const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'site_reservations'
      ORDER BY ordinal_position;
    `);

        console.log('Estrutura atual da tabela site_reservations:');
        console.table(res.rows);

    } catch (err) {
        console.error('Erro executando a query', err.stack);
    } finally {
        await client.end();
    }
}

run();
