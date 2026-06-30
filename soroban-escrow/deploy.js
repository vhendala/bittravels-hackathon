const { Keypair, Horizon, TransactionBuilder, Networks, BASE_FEE, Operation, Contract, rpc, nativeToScVal } = require('@stellar/stellar-sdk');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const oracleSecret = 'SCQLK34TC7GDS4XDWC3X2CEFIIS4SNHSPL2KGYVHM5QGZY5OJXKKO54Z';
  const oracleKp = Keypair.fromSecret(oracleSecret);

  // XLM SAC on Testnet
  const xlmSac = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

  console.log("Compiling Wasm...");
  execSync('cargo build --target wasm32-unknown-unknown --release', { cwd: __dirname });
  const wasm = fs.readFileSync(__dirname + '/target/wasm32-unknown-unknown/release/soroban_escrow.wasm');

  console.log("Uploading Wasm...");
  const oracleAccRpc = await server.getAccount(oracleKp.publicKey());
  let tx4 = new TransactionBuilder(oracleAccRpc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(100)
    .build();
  
  let sim4 = await server.simulateTransaction(tx4);
  let assembled4 = rpc.assembleTransaction(tx4, sim4);
  assembled4.sign(oracleKp);
  let sub4 = await server.submitTransaction(assembled4);
  
  let txStatus;
  while (true) {
      txStatus = await server.getTransaction(sub4.hash);
      if (txStatus.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) break;
      await new Promise(r => setTimeout(r, 2000));
  }
  const wasmId = txStatus.resultMetaXdr.v3().sorobanMeta().returnValue().bytes();
  console.log("Wasm ID:", wasmId.toString('hex'));

  console.log("Deploying & Init Escrow...");
  const oracleAccRpc2 = await server.getAccount(oracleKp.publicKey());
  let tx5 = new TransactionBuilder(oracleAccRpc2, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.createCustomContract({
      wasmId,
      address: new Contract(oracleKp.publicKey()), // Deployer
      constructorArgs: [
        nativeToScVal(oracleKp.publicKey(), { type: 'address' }),
        nativeToScVal(xlmSac, { type: 'address' })
      ]
    }))
    .setTimeout(100)
    .build();
  
  const sim5 = await server.simulateTransaction(tx5);
  let assembled5 = rpc.assembleTransaction(tx5, sim5);
  assembled5.sign(oracleKp);
  let sub5 = await server.submitTransaction(assembled5);
  
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
