import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * POST /api/funding
 * Recebe o endereço público Stellar gerado pela Privy (Embedded Wallet) 
 * e aciona o Friendbot para financiá-lo na rede Testnet.
 * Importante: O Backend NUNCA tem acesso à chave privada.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { address } = req.body;

    if (!address) {
        res.status(400).json({ error: 'Address is required' });
        return;
    }

    console.log(`[Funding] Recebida solicitação de fundos para a carteira: ${address}`);

    try {
        // Na rede Testnet da Stellar, podemos usar o Friendbot para adicionar fundos (10.000 XLM)
        // a qualquer conta recém-criada, permitindo que ela pague taxas.
        const response = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`[Funding] ✅ Carteira ${address} financiada com sucesso pelo Friendbot.`);
            res.status(200).json({ success: true, message: 'Fundos enviados', data });
        } else {
            const errorText = await response.text();
            console.error(`[Funding] ❌ Falha ao acionar Friendbot para ${address}:`, errorText);
            res.status(502).json({ error: 'Falha ao solicitar fundos à rede Stellar', details: errorText });
        }
    } catch (error) {
        console.error(`[Funding] ❌ Erro interno ao financiar a carteira ${address}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
