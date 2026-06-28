# 🌍 Bit Travels
> **Secure, programmable settlement infrastructure for the global travel ecosystem.**

## 🎯 The Problem and the Solution

In the international travel market, consolidators, tour operators, and travel agencies face a complex landscape: high payment processing fees, exposure to fraud, chargeback risks, and cash flow that is often trapped between the sale to the end customer and the settlement with suppliers.

**The Solution:** **Bit Travels** acts as a secure settlement layer designed specifically for the travel industry supply chain. By utilizing programmable payments through **Soroban Escrow** on the Stellar network, we have created a non-custodial architecture that protects all parties involved.
The funds paid by the traveler are safely locked in a smart contract. The release of these funds to the supply chain occurs automatically only after proof that the actual service (such as e-ticket issuance) has been successfully completed. This ensures a reduction in risk exposure for operators and guaranteed security for the buyer.

## 🚀 Why Stellar & Soroban?

Choosing the Stellar ecosystem to build Bit Travels was no accident. We leverage the network's key advantages to create a seamless user experience:

- **Invisible Account Abstraction:** The end customer doesn't need to know what a crypto wallet, seed phrase, or gas fees are. Our infrastructure creates and funds temporary accounts in the background, offering a familiar Web2 experience (like paying via local instant payments) with Web3 security.
- **Efficient Smart Contracts (Soroban):** Our Escrow and conditional release logic requires deterministic, fast execution with predictable fees. Soroban provides the perfect environment, written in Rust, to create secure, low-cost contracts.
- **Low Transaction Costs:** The travel market operates on tight margins. The fractions of a cent charged by the Stellar network make microtransactions and programmable payments viable without compromising business profitability.

## 🏗️ Project Architecture

Our repository is organized as a Monorepo that consolidates the three pillars of our application:

- 📂 `/frontend`: The main application built with Next.js/React. It contains the user interface for flight search, the simulated instant payment flow, and the final e-ticket issuance confirmation screen. All blockchain complexity is abstracted in this layer.
- 📂 `/backend`: Our Node.js API that acts as the **Mocked Oracle**. This service simulates the role of a travel consolidator. When triggered, it confirms the ticket "issuance" and signs the transaction that invokes the release of funds on the blockchain.
- 📂 `/soroban-escrow`: The actual Smart Contract, written in Rust and optimized for the Stellar network. It contains the fundamental logic functions: `lock` (to lock USDC in a non-custodial way) and `release` (to unlock the funds upon authorization from the oracle).

## 🎬 The Demo Flow (Happy Path)

Follow these steps to experience the full journey of our prototype:

1. **Flight Selection:** On the frontend, select the desired flight and click **"Pay"**.
2. **Background Abstraction:** At this moment, the frontend (using Account Abstraction) generates a disposable keypair, requests testnet funds (USDC), and automatically deposits them into the smart contract (Soroban Escrow).
3. **Non-Custodial Proof:** The interface will display a link to **Stellar Expert**, proving on-chain that the funds are secure and locked in the Escrow, inaccessible until the service is provided.
4. **Oracle Simulation:** Click the **"Dev/Mock (Simulate Issuance)"** button. This will trigger the backend (our oracle), which acts as the consolidator and calls the `release` function on the Soroban contract.
5. **Settlement and Success:** The E-Ticket is finally rendered on the user's screen, and the smart contract simultaneously unlocks the money for the consolidator on the blockchain.

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
cargo build --target wasm32-unknown-unknown --release
# Run tests
cargo test
```
*(Make sure to configure the Stellar CLI for the Testnet and deploy the contract, noting the Contract ID).*

### 2. Backend (Mocked Oracle)
```bash
cd backend
# Install dependencies
npm install
# Run the development server
npm run dev
```

### 3. Frontend (Application Interface)
Open a new terminal:
```bash
cd frontend
# Install dependencies
npm install
# Configure your local .env with the Backend URL and the Contract ID
# Run the application
npm run dev
```

Navigate to `http://localhost:3000` in your browser and enjoy the demo!