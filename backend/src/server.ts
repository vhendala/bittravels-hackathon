import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Carrega variáveis de ambiente ANTES de qualquer import de rota (v2)
dotenv.config();

import flightsRouter from './routes/flights';
import bookingsRouter from './routes/bookings';
import locationsRouter from './routes/locations';
import reservationWebhookRouter from './routes/reservation_webhook';
import { initTelegramCron } from './services/telegramMonitor';
import { requireApiKey } from './middleware/auth';

const app: Application = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Deve ser o primeiro middleware: permite ao Express confiar no IP real
// repassado pelo Nginx (reverse proxy da VPS) para rate limiting correto
app.set('trust proxy', 1);

// Segurança de Headers HTTP (Proteção contra Cross-Site Scripting, Sniffing, etc)
app.use(helmet());

// CORS estrito: apenas o domínio oficial em produção, +localhost em dev
const allowedOrigins = [
    'https://bittravels.com.br',
    'https://www.bittravels.com.br',
    ...(!IS_PRODUCTION ? ['http://localhost:3000'] : []),
];

app.use(cors({
    origin: allowedOrigins,
    // credentials: false (padrão) — o frontend não usa cookies cross-origin,
    // não há necessidade de expor esse vetor de ataque
}));

// Limite de payload explícito para mitigar ataques de payload gigante
app.use(express.json({ limit: '1mb' }));

// Configurações de API Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requests por IP a cada 15 min (rotas gerais)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'O limite de requisições foi atingido. Tente novamente mais tarde.' }
});

const searchLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 20, // Limite restrito de buscas de voos/IATAs por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Você realizou muitas buscas num curto espaço de tempo. Tente novamente em alguns minutos.' }
});

// App Routes Base Limit
app.use('/api', apiLimiter);

// Limites Requisitos Amadeus API
app.use('/api/flights/search', searchLimiter);
app.use('/api/locations/resolve', searchLimiter);

// Filtra Scrapers (aplica-se apenas às pontes Frontend-Backend via React)
app.use('/api/flights', requireApiKey, flightsRouter);
app.use('/api/bookings', requireApiKey, bookingsRouter);
app.use('/api/locations', requireApiKey, locationsRouter);

// Webhook Externo do SaaS de milhas (não usa a API Key do frontend do cliente)
app.use('/api/receive-reservation', reservationWebhookRouter);

// Health check mínimo — não expõe nome da aplicação nem versão
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Startup log sem vazar variáveis de ambiente
app.listen(PORT, () => {
    const env = IS_PRODUCTION ? 'production' : 'development';
    console.log(`🚀 Backend running on port ${PORT} [${env}]`);
    
    // Inicializa o monitoramento do Telegram
    initTelegramCron();
});
