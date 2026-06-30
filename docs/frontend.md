# Bit Travels — Frontend Documentation

> **Stack:** Next.js 14 (App Router) · React · Tailwind CSS · Privy (Embedded Wallets) · Stellar SDK

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Directory Structure](#directory-structure)
4. [Authentication & Web3 (Privy)](#authentication--web3-privy)
5. [The `useEscrow` Hook](#the-useescrow-hook)
6. [Checkout Flow](#checkout-flow)
7. [Environment Variables](#environment-variables)
8. [Running Locally](#running-locally)

---

## Overview

The Bit Travels frontend is a modern web application designed to abstract the complexities of Web3 and provide a seamless, Web2-like user experience for travelers. Built with Next.js and Tailwind CSS, it integrates deeply with the Stellar ecosystem to facilitate secure, non-custodial escrow payments for flight reservations.

---

## Key Features

- **Flight Search**: Real-time flight search interface connecting to the Mocked Amadeus backend.
- **Social Login & Embedded Wallets**: Integration with Privy allows users to log in via email or Google, automatically generating a secure, non-custodial Stellar wallet in the background without requiring browser extensions or seed phrases.
- **Smart Contract Integration**: A custom React Hook (`useEscrow`) handles the sequential blockchain transactions required to lock funds securely.
- **Responsive Design**: fully optimized for desktop and mobile environments.

---

## Directory Structure

```text
frontend/
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── checkout/         # Checkout and payment flow
│   ├── search/           # Flight search results page
│   ├── layout.tsx        # Global layout and context providers
│   └── page.tsx          # Landing page
├── components/           # Reusable React components (FlightCard, PaymentForm, etc.)
├── contexts/             # React Contexts (Language, Theme)
├── hooks/                # Custom React Hooks (`useEscrow`, `useLocalStellarWallet`)
├── public/               # Static assets (Images, Icons)
├── tailwind.config.js    # Tailwind styling configuration
└── next.config.js        # Next.js settings and backend proxy rewrites
```

---

## Authentication & Web3 (Privy)

We utilize **Privy** to implement Account Abstraction. The `<PrivyProvider>` wraps the application in `layout.tsx`.

When a user logs in, Privy generates an embedded wallet. We use the custom hook `useLocalStellarWallet` to extract the Stellar public key from this embedded wallet. Since Privy's embedded wallets currently do not natively expose Stellar transaction signing through standard Web3 providers (like wagmi for EVM), we handle the key derivation locally for the hackathon demonstration, ensuring the user's local `Keypair` is used to sign Stellar SDK transactions.

---

## The `useEscrow` Hook

Located at `hooks/useEscrow.ts`, this hook is the bridge between the React frontend and the Soroban smart contract.

**Core Workflow (`lockFunds`):**
1. **Network Configuration**: Connects to the Soroban Testnet RPC.
2. **Account Hydration**: Fetches the user's account sequence and details. If the account doesn't exist (404), it automatically calls **Friendbot** to fund the wallet with testnet XLM.
3. **Approval (Approve)**: Builds, simulates, signs, and submits a transaction invoking the `approve` function on the Native XLM SAC, allowing the Escrow contract to spend the specified amount.
4. **Locking (Lock Funds)**: Once approved, it builds, simulates, signs, and submits a transaction invoking the `lock_funds` function on the Escrow contract.
5. **Confirmation**: Polls the network until the transaction is confirmed, returning the transaction hash for explorer verification.

---

## Checkout Flow

1. **Selection**: User selects a flight from the search results.
2. **Data Entry**: User inputs passenger details on the `/checkout` page.
3. **Payment Method**:
   - Standard Web2 methods (Credit Card) are mocked.
   - The **"PIX"** (Hackathon Web3 Demo) triggers the Privy login modal if unauthenticated.
4. **Blockchain Execution**: Clicking "Já Paguei" triggers the `lockFunds` function. The amount in Fiat (BRL/USD/EUR) is automatically converted to XLM based on current market rates.
5. **Webhook Notification**: Upon successful locking, the frontend submits the full reservation payload to the backend webhook (`/api/receive-reservation`) to finalize the booking.
6. **Success Screen**: The user is presented with a confirmation and a link to view their immutable transaction on Stellar Expert.

---

## Environment Variables

Required variables in `.env`:
- `NEXT_PUBLIC_STELLAR_NETWORK`: Network (e.g., `TESTNET`)
- `NEXT_PUBLIC_STELLAR_RPC_URL`: Soroban RPC endpoint
- `NEXT_PUBLIC_SOROBAN_CONTRACT_ID`: The deployed Escrow Contract ID
- `NEXT_PUBLIC_USDC_CONTRACT_ID`: The token contract ID (Native XLM SAC)
- `NEXT_PUBLIC_PRIVY_APP_ID`: Your Privy application ID for authentication
- `NEXT_PUBLIC_BACKEND_URL`: URL of the Node.js backend (default: `http://localhost:5000`)

---

## Running Locally

1. Install dependencies: `npm install`
2. Create `.env` based on `.env.example`.
3. Start the dev server: `npm run dev`
4. Open `http://localhost:3000` in your browser.
