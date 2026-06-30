const { rpc, Address, Contract } = require('@stellar/stellar-sdk');

async function checkEscrowBalance() {
    const server = new rpc.Server('https://soroban-testnet.stellar.org');
    
    const ESCROW_ID = 'CAY5JUTWZABBP5WUMJ6RYUDTVWTEOID26XA4UXLQIP2REP47VLFKKUVA';
    const XLM_TOKEN_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

    console.log(`🔍 Verificando saldo do Contrato Escrow: ${ESCROW_ID}`);

    const tokenContract = new Contract(XLM_TOKEN_ID);
    const balanceTx = tokenContract.call("balance", new Address(ESCROW_ID));

    try {
        const sim = await server.simulateTransaction({
            // Dummy transaction setup just for simulation
            source: ESCROW_ID,
            fee: "100",
            networkPassphrase: 'Test SDF Network ; September 2015',
            operations: [balanceTx],
            sequence: "0" // Dummy sequence
        } as any);

        if (rpc.Api.isSimulationError(sim)) {
             // In stellar-sdk v12, we can just use the classic horizon endpoint for XLM balances on contract IDs!
             // Wait, Soroban contract addresses start with C... Horizon doesn't support them for balances.
             throw new Error(sim.error);
        }
    } catch(e) {
        // Fallback: the easiest way to read balance is just querying it via horizon if it was a classic account, 
        // but contracts only exist on Soroban RPC.
    }
}
