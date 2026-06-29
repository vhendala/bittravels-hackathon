import express, { Request, Response } from 'express';
import { Keypair, Contract, rpc, TransactionBuilder, Networks, BASE_FEE, nativeToScVal } from '@stellar/stellar-sdk';

const router = express.Router();

/**
 * POST /api/funding
 * 1. Triggers Friendbot to send gas XLM on the Testnet.
 * 2. Transfers 10,000 USDC from the Oracle account to the client.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { address } = req.body;

    if (!address) {
        res.status(400).json({ error: 'Address is required' });
        return;
    }

    console.log(`[Funding] Received funding request for wallet: ${address}`);

    try {
        // 1. Friendbot for XLM
        const friendbotResponse = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`);
        
        if (!friendbotResponse.ok) {
            const errorText = await friendbotResponse.text();
            console.error(`[Funding] ❌ Failed to trigger Friendbot for ${address}:`, errorText);
            res.status(502).json({ error: 'Failed to request funds from Stellar network', details: errorText });
            return;
        }
        
        console.log(`[Funding] ✅ Wallet ${address} funded with XLM by Friendbot.`);

        // 2. Transfer of 10,000 USDC via Soroban contract
        const rpcUrl = process.env.STELLAR_RPC_URL!;
        const oracleSecret = process.env.ORACLE_SECRET_KEY!;
        const usdcContractId = process.env.USDC_CONTRACT_ID!;
        
        const server = new rpc.Server(rpcUrl);
        const oracleKeypair = Keypair.fromSecret(oracleSecret);
        const oracleAddress = oracleKeypair.publicKey();
        
        const usdcContract = new Contract(usdcContractId);
        // 10,000 USDC -> 10,000 * 10^7 = 100,000,000,000
        const amountStroops = '100000000000'; 

        const account = await server.getAccount(oracleAddress);
        
        let tx = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET,
        })
        .addOperation(
            usdcContract.call("transfer",
                nativeToScVal(oracleAddress, { type: 'address' }),
                nativeToScVal(address, { type: 'address' }),
                nativeToScVal(amountStroops, { type: 'i128' })
            )
        )
        .setTimeout(30)
        .build();

        console.log(`[Funding] Simulating USDC transaction...`);
        const simulatedTx = await server.simulateTransaction(tx);
        
        if (!rpc.Api.isSimulationSuccess(simulatedTx)) {
            console.error(`[Funding] ❌ Simulation failed:`, simulatedTx);
            res.status(500).json({ error: 'Simulation failed for USDC transfer' });
            return;
        }

        console.log(`[Funding] Assembling and signing transaction...`);
        tx = rpc.assembleTransaction(tx, simulatedTx) as any;
        tx.sign(oracleKeypair);

        let submitRes = await server.submitTransaction(tx);
        
        if (submitRes.status === 'ERROR') {
            console.error(`[Funding] ❌ Error submitting transaction:`, submitRes);
            res.status(500).json({ error: 'Failed to submit USDC transfer' });
            return;
        }

        // Wait for confirmation
        let txStatus;
        const maxRetries = 10;
        for (let i = 0; i < maxRetries; i++) {
            txStatus = await server.getTransaction(submitRes.hash);
            if (txStatus.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (txStatus?.status === rpc.Api.GetTransactionStatus.SUCCESS) {
            console.log(`[Funding] ✅ 10,000 USDC sent to ${address}`);
            res.status(200).json({ 
                success: true, 
                message: 'Account activated and 10,000 USDC sent', 
                txHash: submitRes.hash 
            });
        } else {
            console.error(`[Funding] ❌ Transaction did not succeed. Status:`, txStatus?.status);
            res.status(500).json({ error: 'USDC transaction failed', status: txStatus?.status });
        }

    } catch (error) {
        console.error(`[Funding] ❌ Internal error funding wallet ${address}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
