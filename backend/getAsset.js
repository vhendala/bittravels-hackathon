const { rpc, Contract, xdr } = require('@stellar/stellar-sdk');

async function main() {
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const contractId = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Contract(contractId).address().toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent()
    })
  );

  const res = await server.getLedgerEntries(ledgerKey);
  if (res.entries && res.entries.length > 0) {
    const data = res.entries[0].val.contractData();
    const instance = data.val().instance();
    console.log(JSON.stringify(instance, null, 2));
  } else {
    console.log("No data found");
  }
}

main().catch(console.error);
