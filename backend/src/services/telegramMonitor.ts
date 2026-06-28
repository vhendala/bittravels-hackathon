import axios from 'axios';
import cron from 'node-cron';

/**
 * Serviço de Monitoramento para Telegram
 * Gerencia o contador de buscas e as notificações automáticas.
 */

// Helper para pegar a URL da API
const getApiUrl = () => {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    console.log('[TelegramMonitor] API URL Gerada (length):', url.length);
    return url;
};

console.log('[TelegramMonitor] Serviço carregado. Token presente:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('[TelegramMonitor] Chat ID Monitor:', process.env.TELEGRAM_MONITOR_CHAT_ID);

// Contador em memória
let searchCounter = 0;
let amadeusCallCounter = 0;

/**
 * Registra e avisa no Telegram que seu servidor fez uma call real (gastou token) na API Amadeus
 */
export const notifyAmadeusCall = (endpoint: string, details: string): void => {
    amadeusCallCounter++;

    const chatId = process.env.TELEGRAM_MONITOR_CHAT_ID;
    if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;

    const text = `🔌 <b>Consumo API Amadeus!</b>\n\n📍 <b>Endpoint:</b> ${endpoint}\n📝 <b>Detalhes:</b> <code>${details}</code>`;

    // Fire-and-forget
    axios.post(getApiUrl(), {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    }).catch(() => {}); // catch silencioso para não poluir console por flood de Amadeus
};

/**
 * Incrementa o contador e envia uma notificação imediata.
 * Implementação "fire-and-forget" para não impactar a performance da rota principal.
 */
export const notifyFlightSearch = (origin: string, destination: string, date: string, ip?: string): void => {
    searchCounter++;

    const chatId = process.env.TELEGRAM_MONITOR_CHAT_ID;

    if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) {
        console.error('[TelegramMonitor] Erro: Credenciais ausentes no .env');
        return;
    }

    // Busca geolocalização se o IP for fornecido
    const fetchCity = async () => {
        let locationInfo = '';
        console.log(`[TelegramMonitor] IP recebido para geolocalização: ${ip}`);

        if (ip && ip !== '::1' && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
            try {
                const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,city,countryCode`);
                if (res.data.status === 'success') {
                    locationInfo = `\n📍 Local: ${res.data.city}, ${res.data.countryCode} (${ip})`;
                } else {
                    locationInfo = `\n📍 IP: ${ip} (Localização indisponível)`;
                }
            } catch (error: any) {
                console.error('[TelegramMonitor] Erro na API de Geolocalização:', error.message);
                locationInfo = `\n📍 IP: ${ip}`;
            }
        } else if (ip) {
            locationInfo = `\n📍 Acesso Local: ${ip}`;
        }

        const text = `🔎 Nova busca de voo realizada no Amadeus!\n\n✈️ Origem: ${origin}\n🏁 Destino: ${destination}\n📅 Data: ${date}${locationInfo}`;

        console.log(`[TelegramMonitor] Enviando notificação de busca: ${origin} -> ${destination}`);

        // Fire-and-forget
        axios.post(getApiUrl(), {
            chat_id: chatId,
            text: text
        }).catch((error) => {
            console.error('[TelegramMonitor] Erro ao enviar notificação imediata:', error.response?.data || error.message);
        });
    };

    fetchCity();
};

/**
 * Envia o resumo horário das buscas realizadas.
 */
const sendHourlySummary = async (): Promise<void> => {
    const currentCount = searchCounter;
    const currentAmadeusCount = amadeusCallCounter;

    // Reseta o contador imediatamente após ler o valor
    searchCounter = 0;
    amadeusCallCounter = 0;

    // Se ambos estiverem virgens (0), corta o processo aqui para evitar mensagem inútil no Telegram
    if (currentCount === 0 && currentAmadeusCount === 0) {
        console.log('[TelegramMonitor] Nenhuma atividade na hora anterior. Ignorando resumo silenciosamente.');
        return;
    }

    const text = `📊 <b>Resumo da última hora:</b>\n\n` +
                 `🔎 Buscas Iniciadas pelos Usuários: <b>${currentCount}</b>\n` +
                 `🔌 Requisições Efetuadas no Amadeus: <b>${currentAmadeusCount}</b>\n\n` +
                 `<i>Se as buscas iniciadas passarem muito das requisições amadeus, o Rate Limit atuou com sucesso barrando bots!</i>`;

    const chatId = process.env.TELEGRAM_MONITOR_CHAT_ID;

    try {
        await axios.post(getApiUrl(), {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });
        console.log(`[TelegramMonitor] Resumo enviado com sucesso: Clientes ${currentCount} / Amadeus ${currentAmadeusCount}.`);
    } catch (error: any) {
        console.error('[TelegramMonitor] Erro ao enviar resumo horário:', error.response?.data || error.message);
    }
};

/**
 * Inicializa o Cron Job que roda no minuto zero de cada hora.
 * Ex: 14:00, 15:00...
 */
export const initTelegramCron = (): void => {
    // '0 * * * *' -> Minuto 0 de cada hora
    cron.schedule('0 * * * *', () => {
        console.log('[TelegramMonitor] Executando resumo horário...');
        sendHourlySummary();
    });

    console.log('[TelegramMonitor] Cron Job de monitoramento inicializado (roda no minuto 0 de cada hora).');
};
