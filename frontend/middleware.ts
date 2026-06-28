import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware
 * Atua como um interceptador silencioso que roda no lado do SERVIDOR do frontend.
 * Como ele roda escondido no Node (Edge), o usuário no navegador nunca verá a adição desse header.
 * 
 * Função: Adiciona a senha secreta x-api-key em todas as requisições enviadas ao Backend (proxy /api/).
 */
export function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const secretKey = process.env.BITTRAVELS_API_KEY;
        const requestHeaders = new Headers(request.headers);
        
        if (secretKey) {
            // Embutindo a chave-mestra invisível
            requestHeaders.set('x-api-key', secretKey);
        }
        
        // Retorna a requisição original com as novas headers unidas, enviando-as para o Rewrite
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }
    
    return NextResponse.next();
}

// Performance: Isso obriga a engine a rodar este script EXCLUSIVAMENTE para a rota da API (evita enlentecer imagens ou JS)
export const config = {
  matcher: '/api/:path*',
};
