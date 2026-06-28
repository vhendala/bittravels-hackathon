import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Interface to interact with the Bit Travels Soroban Escrow contract.
 * Uses the Oracle's secret key (backend) to release funds.
 */

const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'public' 
    ? StellarSdk.Networks.PUBLIC 
    : StellarSdk.Networks.TESTNET;

const RPC_URL = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

const rpc = new StellarSdk.rpc.Server(RPC_URL);

/**
 * Releases the funds held in the Soroban Escrow for a given booking ID.
 * The transaction is signed by the Oracle (Backend).
 * 
 * @param bookingId The booking reference ID (e.g. "BT0042")
 * @returns The transaction hash if successful
 */
export async function releaseFundsToAgency(bookingId: string): Promise<string> {
    const secretKey = process.env.ORACLE_SECRET_KEY;
    const contractId = process.env.SOROBAN_CONTRACT_ID;
    const agencyAddress = process.env.AGENCY_ADDRESS;

    if (!secretKey) throw new Error("ORACLE_SECRET_KEY is not configured.");
    if (!contractId) throw new Error("SOROBAN_CONTRACT_ID is not configured.");
    if (!agencyAddress) throw new Error("AGENCY_ADDRESS is not configured.");

    const oracleKeypair = StellarSdk.Keypair.fromSecret(secretKey);

    console.log(`[Soroban] Releasing funds for ${bookingId} to agency ${agencyAddress}...`);

    try {
        const account = await rpc.getAccount(oracleKeypair.publicKey());
        const contract = new StellarSdk.Contract(contractId);

        // 1. Prepare Arguments
        const bookingIdSymbol = StellarSdk.nativeToScVal(bookingId, { type: "symbol" });
        const agencyAddressVal = StellarSdk.Address.fromString(agencyAddress).toScVal();

        // 2. Build Base Transaction
        let transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
        .addOperation(contract.call("release_funds", bookingIdSymbol, agencyAddressVal))
        .setTimeout(180)
        .build();

        // 3. Simulate Transaction (Mandatory for Soroban)
        const simulation = await rpc.simulateTransaction(transaction);

        if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
            console.error("[Soroban] Simulation error:", simulation.error);
            throw new Error(`Simulation failed: ${simulation.error}`);
        }

        // 4. Assemble with Simulation Data (fees, resources, footprints)
        transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();

        // 5. Sign with Oracle Secret Key
        transaction.sign(oracleKeypair);

        // 6. Submit Transaction
        const response = await rpc.sendTransaction(transaction);

        if (response.status === "ERROR") {
            throw new Error(`Transaction failed during submission: ${response.errorResult}`);
        }

        // 7. Poll for Completion
        let getResponse = await rpc.getTransaction(response.hash);
        while (getResponse.status === "NOT_FOUND") {
            await new Promise(resolve => setTimeout(resolve, 1500));
            getResponse = await rpc.getTransaction(response.hash);
        }

        if (getResponse.status === "SUCCESS") {
            console.log(`[Soroban] ✅ Funds released successfully! TxHash: ${response.hash}`);
            return response.hash;
        } else {
            console.error(`[Soroban] Transaction failed on chain. Status: ${getResponse.status}`);
            throw new Error(`Transaction failed on chain. Status: ${getResponse.status}`);
        }
    } catch (error) {
        console.error(`[Soroban] Error releasing funds for ${bookingId}:`, error);
        throw error;
    }
}
