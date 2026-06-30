const { Keypair, Horizon, TransactionBuilder, Networks, BASE_FEE, Operation, Contract, rpc, nativeToScVal, xdr, Address } = require('@stellar/stellar-sdk');

async function main() {
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  
  const oldEscrowId = 'CAA7ONVD3TNCRNBIOQXPJWGJIWCKWSNG5XX7FZEYA6R6V4CWP3G7XCYF';
  
  console.log("Fetching wasm_id from old contract...");
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Contract(oldEscrowId).address().toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent()
    })
  );

  const res = await server.getLedgerEntries(ledgerKey);
  const data = res.entries[0].val.contractData();
  const instance = data.val().instance();
  const wasmId = instance.executable().wasmHash();
  console.log("Wasm ID:", wasmId.toString('hex'));

  const oracleSecret = 'SCQLK34TC7GDS4XDWC3X2CEFIIS4SNHSPL2KGYVHM5QGZY5OJXKKO54Z';
  const oracleKp = Keypair.fromSecret(oracleSecret);

  // XLM SAC on Testnet
  const xlmSac = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

  console.log("Deploying & Init NEW Escrow...");
  oracleAccRpc2 = await server.getAccount(oracleKp.publicKey());
  let tx5 = new TransactionBuilder(oracleAccRpc2, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.createCustomContract({
      wasmHash: wasmId,
      address: Address.fromString(oracleKp.publicKey()),
      constructorArgs: [
        nativeToScVal(oracleKp.publicKey(), { type: 'address' }),
        nativeToScVal(xlmSac, { type: 'address' })
      ]
    }))
    .setTimeout(100)
    .build();
  
  const sim5 = await server.simulateTransaction(tx5);
  let assembled5 = rpc.assembleTransaction(tx5, sim5);
  
  // Handle different SDK versions (builder vs tx object)
  let finalTx = typeof assembled5.build === 'function' ? assembled5.build() : assembled5;
  finalTx.sign(oracleKp);
  
  let sub5 = await server.sendTransaction(finalTx);
  
  let txStatus;
  while (true) {
      txStatus = await server.getTransaction(sub5.hash);
      if (txStatus.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) break;
      await new Promise(r => setTimeout(r, 2000));
  }
  
  const escrowIdStr = Contract.fromXDR(txStatus.resultMetaXdr.v3().sorobanMeta().returnValue()).address().toString();
  console.log("ESCROW DEPLOYED!");
  console.log("NEW ESCROW CONTRACT ID:", escrowIdStr);
}

main().catch(console.error);
