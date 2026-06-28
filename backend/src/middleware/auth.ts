import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de Autenticação (Backend-to-Backend / Frontend-to-Backend)
 * Bloqueia chamadas diretas feitas por ferramentas de terceiro (Scrapers, Python, Postman)
 * que não possuem a senha secreta embutida no cabeçalho x-api-key.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const incomingKey = req.header('x-api-key');
    const validKey = process.env.BITTRAVELS_API_KEY;

    // Fallback: Se o sysadmin ainda não configurou a variável de ambiente (ex: localhost inicial),
    // apenas emita um aviso visual mas não crashe a aplicação.
    if (!validKey) {
        console.warn('⚠️ [Aviso de Segurança] Variável BITTRAVELS_API_KEY não definida no arquivo .env.');
        console.warn('A API principal está exposta para consumo. Recomendado criar a senha antes do Go-Live.');
        return next();
    }

    if (!incomingKey || incomingKey !== validKey) {
        // Encontra o suposto IP agressor
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
        console.warn(`🛑 [Defesa Ativada] Tentativa de scrape barrada. IP agressor: ${ip} | Alvo: ${req.originalUrl}`);
        
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or Invalid API Key. Direct access to this endpoint is forbidden.'
        });
    }

    next();
}
