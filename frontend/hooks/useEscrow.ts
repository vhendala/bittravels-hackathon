import { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// O Contract ID deve estar configurado no .env (ex: NEXT_PUBLIC_SOROBAN_CONTRACT_ID)
const CONTRACT_ID = process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID || '';
// Opcional: Configurar rede (Testnet por padrão)
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

export function useEscrow() {
    const { user } = usePrivy();
    const { wallets } = useWallets();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lockFunds = async (amount: number, bookingId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            if (!user) throw new Error("User not authenticated.");

            // Get the Privy embedded wallet (created on login via embeddedWallets.createOnLogin)
            const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
            const walletAddress = embeddedWallet?.address ?? user.wallet?.address;
            if (!walletAddress) throw new Error("Stellar wallet not found. Please log out and log in again.");
            if (!CONTRACT_ID) throw new Error("Escrow Contract ID not configured.");
            
            const tokenAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA'; // Default Testnet USDC

            // Fetch account and current ledger to set expiration
            const account = await rpc.getAccount(walletAddress);
            const latestLedger = await rpc.getLatestLedger();
            const expirationLedger = latestLedger.sequence + 1000;

            const clientScAddress = StellarSdk.Address.fromString(walletAddress).toScVal();
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

            txApprove = StellarSdk.rpc.assembleTransaction(txApprove, simApprove).build();

            // Sign with the Privy embedded wallet (v3 API)
            let signedApproveXdr: string;
            if (embeddedWallet && 'signTransaction' in embeddedWallet) {
                signedApproveXdr = await (embeddedWallet as any).signTransaction(txApprove.toXDR());
            } else {
                // Fallback: Privy v2 pattern
                // @ts-ignore
                signedApproveXdr = await user.signTransaction(txApprove.toXDR());
            }
            const signedTxApprove = StellarSdk.TransactionBuilder.fromXDR(signedApproveXdr, NETWORK_PASSPHRASE) as StellarSdk.Transaction;
            
            const resApprove = await rpc.sendTransaction(signedTxApprove);
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
            const updatedAccount = await rpc.getAccount(walletAddress);
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

            txLock = StellarSdk.rpc.assembleTransaction(txLock, simLock).build();

            // Sign with the Privy embedded wallet (v3 API)
            let signedLockXdr: string;
            if (embeddedWallet && 'signTransaction' in embeddedWallet) {
                signedLockXdr = await (embeddedWallet as any).signTransaction(txLock.toXDR());
            } else {
                // Fallback: Privy v2 pattern
                // @ts-ignore
                signedLockXdr = await user.signTransaction(txLock.toXDR());
            }
            const signedTxLock = StellarSdk.TransactionBuilder.fromXDR(signedLockXdr, NETWORK_PASSPHRASE) as StellarSdk.Transaction;

            const resLock = await rpc.sendTransaction(signedTxLock);
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

            // ==========================================
            // PASSO 3: AVISAR BACKEND
            // ==========================================
            const backendRes = await fetch('/api/receive-reservation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId })
            });

            if (!backendRes.ok) {
                throw new Error("Transação aprovada na rede, mas houve erro ao avisar o servidor.");
            }

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
