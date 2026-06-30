import { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { useLocalStellarWallet } from './useLocalStellarWallet';

// O Contract ID deve estar configurado no .env (ex: NEXT_PUBLIC_SOROBAN_CONTRACT_ID)
const CONTRACT_ID = process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID || 'CAY5JUTWZABBP5WUMJ6RYUDTVWTEOID26XA4UXLQIP2REP47VLFKKUVA';
// Opcional: Configurar rede (Testnet por padrão)
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

export function useEscrow() {
    const { keypair, publicKey } = useLocalStellarWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lockFunds = async (amount: number, bookingId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            if (!keypair || !publicKey) throw new Error("Local Stellar wallet not found.");
            if (!CONTRACT_ID) throw new Error("Escrow Contract ID not configured.");
            
            const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // Native XLM SAC
            const horizon = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

            // 1. Ensure Account exists (Friendbot if 404)
            let accountInfo;
            try {
                accountInfo = await horizon.loadAccount(publicKey);
            } catch (e: any) {
                if (e?.response?.status === 404) {
                    console.log("[useEscrow] Conta não existe. Chamando Friendbot para XLM...");
                    await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    accountInfo = await horizon.loadAccount(publicKey);
                } else {
                    throw e;
                }
            }

            // XLM is automatically trusted, no ChangeTrust needed.
            const requiredUsdc = amount / 1e7;
            console.log(`[useEscrow] Bloqueando ${requiredUsdc} XLM...`);

            // Fetch account and current ledger to set expiration for Soroban
            const account = await rpc.getAccount(publicKey);
            const latestLedger = await rpc.getLatestLedger();
            const expirationLedger = latestLedger.sequence + 1000;

            const clientScAddress = StellarSdk.Address.fromString(publicKey).toScVal();
            const spenderScAddress = StellarSdk.Address.fromString(CONTRACT_ID).toScVal();
            const amountI128 = StellarSdk.nativeToScVal(BigInt(Math.floor(amount)), { type: "i128" });
            const expirationU32 = StellarSdk.nativeToScVal(expirationLedger, { type: "u32" });
            const bookingIdSymbol = StellarSdk.nativeToScVal(bookingId, { type: "symbol" });

            // ==========================================
            // PASSO 1: APROVAÇÃO (Allowance)
            // ==========================================
            console.log("[useEscrow] Passo 1: Solicitando aprovação (approve) do token...");
            const tokenContract = new StellarSdk.Contract(tokenAddress);
            
            let txApprove = new StellarSdk.TransactionBuilder(account, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
            .addOperation(tokenContract.call("approve", clientScAddress, spenderScAddress, amountI128, expirationU32))
            .setTimeout(180)
            .build();

            const simApprove = await rpc.simulateTransaction(txApprove);
            if (StellarSdk.rpc.Api.isSimulationError(simApprove)) {
                throw new Error(`Falha na simulação de aprovação: ${simApprove.error}`);
            }

            txApprove = StellarSdk.rpc.assembleTransaction(txApprove, simApprove).build() as any;

            // Sign directly with local keypair
            txApprove.sign(keypair);
            
            const resApprove = await rpc.sendTransaction(txApprove);
            if (resApprove.status === "ERROR") {
                throw new Error(`Erro ao enviar aprovação: ${resApprove.errorResult}`);
            }

            // Polling para confirmar aprovação
            let getResApprove = await rpc.getTransaction(resApprove.hash);
            while (getResApprove.status === "NOT_FOUND") {
                await new Promise(resolve => setTimeout(resolve, 1500));
                getResApprove = await rpc.getTransaction(resApprove.hash);
            }

            if (getResApprove.status !== "SUCCESS") {
                throw new Error(`Falha na aprovação na rede. Status: ${getResApprove.status}`);
            }

            console.log("[useEscrow] Passo 1 Concluído: Aprovação confirmada.");

            // ==========================================
            // PASSO 2: DEPÓSITO (Lock Funds)
            // ==========================================
            console.log("[useEscrow] Passo 2: Executando lock_funds no Escrow...");
            
            // Recarrega a account para atualizar o sequence number após a primeira transação
            const updatedAccount = await rpc.getAccount(publicKey);
            const escrowContract = new StellarSdk.Contract(CONTRACT_ID);

            let txLock = new StellarSdk.TransactionBuilder(updatedAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
            .addOperation(escrowContract.call("lock_funds", bookingIdSymbol, clientScAddress, amountI128))
            .setTimeout(180)
            .build();

            const simLock = await rpc.simulateTransaction(txLock);
            if (StellarSdk.rpc.Api.isSimulationError(simLock)) {
                throw new Error(`Falha na simulação do lock_funds: ${simLock.error}`);
            }

            txLock = StellarSdk.rpc.assembleTransaction(txLock, simLock).build() as any;

            // Sign directly with local keypair
            txLock.sign(keypair);

            const resLock = await rpc.sendTransaction(txLock);
            if (resLock.status === "ERROR") {
                throw new Error(`Erro ao enviar lock_funds: ${resLock.errorResult}`);
            }

            // Polling para confirmar o lock_funds
            let getResLock = await rpc.getTransaction(resLock.hash);
            while (getResLock.status === "NOT_FOUND") {
                await new Promise(resolve => setTimeout(resolve, 1500));
                getResLock = await rpc.getTransaction(resLock.hash);
            }

            if (getResLock.status !== "SUCCESS") {
                throw new Error(`Falha no lock_funds na rede. Status: ${getResLock.status}`);
            }

            console.log("[useEscrow] Passo 2 Concluído: Fundos travados no contrato.");

            console.log("[useEscrow] Passo 2 Concluído: Fundos travados no contrato.");

            return { success: true, hash: resLock.hash };

        } catch (err: any) {
            console.error("[useEscrow] Erro:", err);
            setError(err.message || "Ocorreu um erro ao processar o pagamento. Tente novamente.");
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        lockFunds,
        isLoading,
        error
    };
}
