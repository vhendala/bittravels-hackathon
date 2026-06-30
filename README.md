# 🌍 Bit Travels
> **Secure, programmable settlement infrastructure for the global travel ecosystem.**

---

## 📎 Project Resources

| Resource | Link |
|---|---|
| 🎤 **Pitch Deck, Validation Interviews & Demo Video** | [View on Google Drive](https://drive.google.com/drive/folders/1EJiYNB5F2q1aZz1WX1BrDjrW7rKRjd_W?usp=sharing) |

---

## 🎯 The Problem and the Solution

In the international travel market, consolidators, tour operators, and travel agencies face a complex landscape: high payment processing fees, exposure to fraud, chargeback risks, and cash flow that is often trapped between the sale to the end customer and the settlement with suppliers.

**The Solution:** **Bit Travels** acts as a secure settlement layer designed specifically for the travel industry supply chain. By utilizing programmable payments through **Soroban Escrow** on the Stellar network, we have created a non-custodial architecture that protects all parties involved.
The funds paid by the traveler are safely locked in a smart contract. The release of these funds to the supply chain occurs automatically only after proof that the actual service (such as e-ticket issuance) has been successfully completed. This ensures a reduction in risk exposure for operators and guaranteed security for the buyer.

## 🚀 Why Stellar & Soroban?

Choosing the Stellar ecosystem to build Bit Travels was no accident. We leverage the network's key advantages to create a seamless user experience:

- **Seamless Account Abstraction (Privy MPC):** The end customer doesn't need to know what a crypto wallet, seed phrase, or gas fees are. Our infrastructure uses **Privy** Embedded Wallets to create secure, non-custodial wallets linked to the user's social login or email, offering a familiar Web2 experience with Web3 security.
- **Efficient Smart Contracts (Soroban):** Our Escrow and conditional release logic requires deterministic, fast execution with predictable fees. Soroban provides the perfect environment, written in Rust, to create secure, low-cost contracts.
- **Low Transaction Costs:** The travel market operates on tight margins. The fractions of a cent charged by the Stellar network make microtransactions and programmable payments viable without compromising business profitability.

## 🏗️ Project Architecture

Our repository is organized as a Monorepo that consolidates the three pillars of our application:

- 📂 `/frontend`: The main application built with Next.js/React. It contains the user interface for flight search, the Privy authentication flow, and the payment screen that sequentially approves and locks Native XLM into the Soroban Escrow. All blockchain complexity is abstracted in this layer through our `useEscrow` hook.
- 📂 `/backend`: Our Node.js API that acts as the **Mocked Oracle**. This service simulates the role of a travel consolidator. When triggered, it confirms the ticket "issuance" and signs the transaction using its securely held private key, invoking the `release_funds` function on the blockchain to send the locked XLM to the travel agency.
- 📂 `/soroban-escrow`: The actual Smart Contract, written in Rust and optimized for the Stellar network. It contains the fundamental logic functions: `lock_funds` (to lock XLM in a non-custodial way) and `release_funds` (to unlock the funds upon authorization from the oracle).

## 🎬 The Demo Flow (Happy Path)

Follow these steps to experience the full journey of our prototype:

1. **Flight Selection:** On the frontend, select the desired flight and proceed to checkout.
2. **Authentication:** The user logs in seamlessly using Privy (Google/Email).
3. **Escrow Lock (Web3):** When the user clicks to pay via "PIX", the frontend transparently:
   - Requests approval to move XLM (`approve`).
   - Locks the funds into the smart contract (`lock_funds`).
   - The user signs these transactions safely via the Privy Embedded Wallet.
4. **Non-Custodial Proof:** The interface displays the transaction hash linking to **Stellar Expert**, proving on-chain that the funds are secure and locked in the Escrow, inaccessible until the service is provided.
5. **Settlement and Success (Oracle):** Once the backend confirms the ticket is issued, it securely signs and dispatches the `release_funds` transaction to the Stellar network, unlocking the money for the travel agency.

## 🛠️ Setup and Execution Instructions

To run Bit Travels locally and test the demonstration, follow the steps below:

### Prerequisites
- Node.js (v18+)
- Rust and Cargo (to compile Soroban)
- Stellar CLI (Soroban CLI)

### 1. Smart Contract (Soroban)
```bash
cd soroban-escrow
# Compile the contract
stellar contract build
# Run tests
cargo test
```
*(Deploy the contract to Testnet using your oracle and token addresses, and save the Contract ID in the `.env` files).*

### 2. Backend (Mocked Oracle)
```bash
cd backend
# Install dependencies
npm install
# Configure your local .env (ORACLE_SECRET_KEY, SOROBAN_CONTRACT_ID, etc.)
# Run the development server
npm run dev
```

### 3. Frontend (Application Interface)
Open a new terminal:
```bash
cd frontend
# Install dependencies
npm install
# Configure your local .env (NEXT_PUBLIC_PRIVY_APP_ID, NEXT_PUBLIC_SOROBAN_CONTRACT_ID, etc.)
# Run the application
npm run dev
```

Navigate to `http://localhost:3000` in your browser and enjoy the demo!