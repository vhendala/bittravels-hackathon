/**
 * Envia notificações de novas reservas para o Telegram e repassa ao SaaS externo.
 * Responsabilidade única: comunicação com serviços de terceiros.
 */
import { SanitizedCustomer } from './reservationSanitizer';

function buildTelegramMessage(
    internal_id: string,
    customer: SanitizedCustomer,
    flight: Record<string, unknown>,
    payment: Record<string, unknown>
): string {
    return (
        `🚨 <b>NOVA RESERVA RECEBIDA</b> 🚨\n\n` +
        `🆔 <b>ID Interno:</b> ${internal_id}\n\n` +
        `👤 <b>DADOS DO CLIENTE</b>\n` +
        `<b>Nome:</b> ${customer.first_name} ${customer.last_name}\n` +
        `<b>Nascimento:</b> ${customer.birth_date || 'N/A'} | <b>Sexo:</b> ${customer.gender}\n` +
        `<b>País:</b> ${customer.country}\n` +
        `<b>Passaporte:</b> ${customer.passport || 'N/A'}\n` +
        `<b>CPF:</b> ${customer.cpf || 'N/A'}\n` +
        `<b>E-mail:</b> ${customer.email}\n` +
        `<b>WhatsApp:</b> ${customer.whatsapp_phone}\n\n` +
        `✈️ <b>DADOS DO VOO</b>\n` +
        `<b>ID Amadeus:</b> ${flight.amadeus_flight_id}\n` +
        `<b>Trecho:</b> ${flight.route}\n` +
        `<b>Data de Ida:</b> ${flight.departure_date}\n` +
        (flight.return_date ? `<b>Data de Volta:</b> ${flight.return_date}\n\n` : '\n') +
        `💳 <b>PAGAMENTO</b>\n` +
        `<b>Método:</b> ${payment.payment_method}`
    );
}

export async function notifyTelegram(
    internal_id: string,
    customer: SanitizedCustomer,
    flight: Record<string, unknown>,
    payment: Record<string, unknown>
): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.error('[Notifier] Telegram credentials are not set in .env');
        return;
    }

    const message = buildTelegramMessage(internal_id, customer, flight, payment);

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
        .then(async (response) => {
            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Notifier] Erro resposta Telegram:', errorData);
            } else {
                console.log('[Notifier] ✅ Notificação de reserva enviada ao Telegram!');
            }
        })
        .catch((error) => console.error('[Notifier] ❌ Erro na requisição Telegram:', error));
}

export async function forwardToSaas(
    originalBody: Record<string, unknown>,
    customer: SanitizedCustomer
): Promise<void> {
    const url = process.env.SAAS_WEBHOOK_URL;
    const apiKey = process.env.SAAS_API_KEY;

    if (!url || !apiKey) {
        console.error('[Notifier] SaaS credentials (SAAS_WEBHOOK_URL, SAAS_API_KEY) are not set in .env');
        return;
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ ...originalBody, customer }),
    }).catch((error) => console.error('[Notifier] ❌ Erro no repasse para o SaaS:', error));
}
