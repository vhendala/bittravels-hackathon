require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await client.connect();
        console.log('Conectado ao banco de dados Neon.');

        const sql = `
-- 1. Renomear a tabela
ALTER TABLE reservas_site RENAME TO site_reservations;

-- 2. Renomear as colunas
ALTER TABLE site_reservations RENAME COLUMN id_interno TO internal_id;
ALTER TABLE site_reservations RENAME COLUMN nome TO first_name;
ALTER TABLE site_reservations RENAME COLUMN sobrenome TO last_name;
ALTER TABLE site_reservations RENAME COLUMN pais TO country;
ALTER TABLE site_reservations RENAME COLUMN passaporte TO passport;
ALTER TABLE site_reservations RENAME COLUMN data_nascimento TO birth_date;
ALTER TABLE site_reservations RENAME COLUMN sexo TO gender;
ALTER TABLE site_reservations RENAME COLUMN telefone_whatsapp TO whatsapp_phone;
ALTER TABLE site_reservations RENAME COLUMN forma_pagamento TO payment_method;
ALTER TABLE site_reservations RENAME COLUMN dados_voo TO flight_data;
ALTER TABLE site_reservations RENAME COLUMN status_integracao TO integration_status;
ALTER TABLE site_reservations RENAME COLUMN tentativas_envio TO retry_count;
ALTER TABLE site_reservations RENAME COLUMN criado_em TO created_at;
ALTER TABLE site_reservations RENAME COLUMN atualizado_em TO updated_at;

-- 3. Atualizar o valor padrão do status de integração
ALTER TABLE site_reservations ALTER COLUMN integration_status SET DEFAULT 'pending';

-- 4. Atualizar qualquer registro existente (caso haja) de 'pendente' para 'pending'
UPDATE site_reservations SET integration_status = 'pending' WHERE integration_status = 'pendente';
    `;

        await client.query(sql);
        console.log('Tabela e colunas renomeadas com sucesso.');

        // Simular o \d para mostrar a nova estrutura
        const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'site_reservations'
      ORDER BY ordinal_position;
    `);

        console.log('\\nEstrutura atual da tabela site_reservations:');
        console.table(res.rows);

    } catch (err) {
        console.error('Erro executando a query', err.stack);
    } finally {
        await client.end();
    }
}

run();
