# Bit Travels — Soroban Escrow Contract

Programmable escrow for the travel settlement layer, deployed on **Stellar (Soroban)**.

---

## Architecture

```
Client (Privy MPC Wallet)
    │
    │  1. approve(contract, amount)   ← token allowance
    │  2. lock_funds(booking_id, ...)  ← signed by Privy
    ▼
EscrowContract (holds USDC)
    │
    │  3. e-ticket issued by airline GDS
    │
    │  4. release_funds(booking_id, agency)  ← signed by Oracle (backend)
    ▼
Agency Wallet  ←  receives USDC
```

---

## Functions

| Function | Auth required | Description |
|---|---|---|
| `lock_funds(booking_id, client, amount)` | Client | Pulls USDC from client into contract |
| `release_funds(booking_id, agency)` | **Oracle only** | Transfers USDC to travel agency |
| `refund(booking_id)` | Client | Returns USDC to client (dispute) |
| `get_reservation(booking_id)` | None | Read-only state query |
| `get_oracle()` | None | Returns oracle address |
| `get_token()` | None | Returns token (USDC) address |

---

## Prerequisites

```bash
# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Add WASM target
rustup target add wasm32-unknown-unknown

# Fund a testnet identity
stellar keys generate --global oracle --network testnet --fund
stellar keys generate --global agency  --network testnet --fund
```

---

## Build

```bash
cd soroban-escrow

# Optimised WASM (production)
stellar contract build

# Output: target/wasm32-unknown-unknown/release/bittravels_escrow.wasm
```

---

## Tests

```bash
cargo test
```

---

## Deploy to Testnet

```bash
# 1. Deploy the contract (constructor args: oracle address + USDC SAC address)
ORACLE_ADDRESS=$(stellar keys address oracle)

# USDC SAC on Testnet (official SDF deployment)
USDC_SAC="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/bittravels_escrow.wasm \
  --source oracle \
  --network testnet \
  -- \
  --oracle $ORACLE_ADDRESS \
  --token  $USDC_SAC

# 2. Save the returned CONTRACT_ID
export CONTRACT_ID="C..."
```

---

## Invoke via CLI

```bash
# Lock 10 USDC (10 * 10^7 = 100_000_000 units)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source client-wallet \
  --network testnet \
  -- \
  lock_funds \
  --booking_id BT0001 \
  --client     $CLIENT_ADDRESS \
  --amount     100000000

# Release to agency (only oracle can do this)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source oracle \
  --network testnet \
  -- \
  release_funds \
  --booking_id BT0001 \
  --agency     $AGENCY_ADDRESS

# Query reservation state
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_reservation \
  --booking_id BT0001
```

---

## Environment Variables (Backend)

Add to `backend/.env`:

```env
# Soroban Escrow
SOROBAN_CONTRACT_ID=C...
ORACLE_SECRET_KEY=S...   # Keep in HSM / Vault — never commit
STELLAR_NETWORK=testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

---

## Security Notes

- The **oracle private key** must be kept in a secure server environment (HSM, AWS KMS, or environment secrets). It should **never** be committed to the repository.
- The **client private key** is managed by Privy MPC — the backend never has access to it.
- The `__constructor` pattern (Protocol 22) ensures the oracle and token addresses are set atomically at deployment and cannot be overwritten later.
- All monetary state mutations (`lock`, `release`, `refund`) emit events, enabling full auditability via the Stellar RPC event stream.
