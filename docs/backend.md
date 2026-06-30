# Bit Travels — Backend Documentation

> **Stack:** Node.js · Express · TypeScript · ts-node-dev · Amadeus API · Stellar Friendbot

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Server Bootstrap (`server.ts`)](#server-bootstrap-serverts)
5. [Routes](#routes)
6. [Services](#services)
7. [Middleware](#middleware)
8. [Soroban Oracle Service](#soroban-oracle-service-sorobants)
9. [Security Model](#security-model)
10. [In-Memory Flight Cache](#in-memory-flight-cache)
11. [Environment Variables](#environment-variables)
12. [Running Locally](#running-locally)

---

## Overview

The Bit Travels backend serves as the core orchestration layer connecting the frontend, the Amadeus GDS (Global Distribution System), and the Stellar blockchain (Soroban smart contracts). It acts as a **Mocked Oracle** for the Soroban Escrow contract, managing the validation of real-world events (like ticket issuance) and cryptographically signing transactions to release funds to the travel agency.

---

## Architecture

The backend follows a standard multi-tier REST API architecture:

- **Routing Layer (`/routes`)**: Defines Express endpoints and handles HTTP request/response cycles.
- **Service Layer (`/services`)**: Contains the core business logic (Amadeus integration, payload sanitization, caching).
- **Oracle Layer (`soroban.ts`)**: Securely manages the Oracle's private key and interacts with the Soroban RPC to submit `release_funds` transactions.
- **Middleware Layer (`/middleware`)**: Handles authentication (API Keys), request validation, and rate-limiting.

---

## Directory Structure

```text
backend/
├── src/
│   ├── middleware/      # Express middlewares (Auth, Rate Limiting)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic and external API integrations
│   ├── types/           # TypeScript interfaces and type definitions
│   └── server.ts        # Express application entry point
├── .env                 # Environment variables
├── package.json         # Dependencies and NPM scripts
└── tsconfig.json        # TypeScript configuration
```

---

## Server Bootstrap (`server.ts`)

The `server.ts` file is the entry point of the application. It initializes the Express app and configures:

- **Helmet**: Secures HTTP headers against common vulnerabilities.
- **CORS**: Restricts cross-origin requests to trusted domains (`http://localhost:3000` in development).
- **Rate Limiting**: Protects endpoints from DDoS and scraping (e.g., `apiLimiter`, `searchLimiter`).
- **Route Mounting**: Connects the various routers to their base paths.

---

## Routes

### Flight Search & Bookings (Amadeus Integration)
- **`POST /api/flights/search`**: Queries the Amadeus API for flight offers based on origin, destination, dates, and passengers. Results are cached in-memory.
- **`GET /api/locations/resolve`**: Resolves IATA codes or city names to standard Amadeus location codes.
- **`POST /api/bookings`**: Creates a flight order in the Amadeus system (mocked in the hackathon).
- **`POST /api/bookings/confirm/:bookingId`**: Confirms a booking and triggers the Oracle to release funds on the blockchain.

### Webhooks
- **`POST /api/receive-reservation`**: Receives the final reservation payload from the frontend after funds have been locked in the Escrow contract. It validates the data and simulates the ticketing process.

### Wallet Funding
- **`POST /api/funding`**: (Deprecated/Modified) Originally used to transfer USDC, now serves as an interface for managing testnet XLM allocations via Friendbot.

---

## Services

### Amadeus Service (`amadeus.ts`)
Handles authentication and communication with the Amadeus Travel API. It fetches real-time flight offers and pricing data.

### Reservation Sanitizer (`reservationSanitizer.ts`)
Validates and sanitizes incoming reservation payloads from the frontend, ensuring no missing fields before processing.

---

## Soroban Oracle Service (`soroban.ts`)

This is the most critical component of the blockchain integration. It acts as the trusted entity (Oracle) that validates real-world events.

**Key Responsibilities:**
1. **Secure Key Management**: Uses the `ORACLE_SECRET_KEY` from the environment variables.
2. **Transaction Building**: Constructs the `release_funds` transaction targeting the Escrow contract.
3. **Simulation**: Simulates the transaction against the Soroban RPC to ensure success and estimate fees.
4. **Submission**: Signs and submits the transaction to the Stellar network, releasing the locked XLM to the agency's account.

---

## Security Model

- **API Keys**: Critical endpoints (like flight bookings) are protected by a static `BITTRAVELS_API_KEY`.
- **Non-Custodial Escrow**: The backend never holds user funds. It only possesses the key required to trigger the `release_funds` function, meaning it can only release funds to the predefined agency address, not steal them.

---

## In-Memory Flight Cache

To respect Amadeus API rate limits and improve response times, flight search results are cached in-memory for 15 minutes using a hash of the search parameters.

---

## Environment Variables

Required variables in `.env`:
- `PORT`: Server port (default: 5000)
- `AMADEUS_CLIENT_ID` & `AMADEUS_CLIENT_SECRET`: Credentials for the Amadeus API.
- `BITTRAVELS_API_KEY`: Secret key for protecting internal endpoints.
- `STELLAR_NETWORK` & `STELLAR_RPC_URL`: Stellar network configuration (e.g., testnet).
- `SOROBAN_CONTRACT_ID`: The deployed Escrow Contract ID (e.g., `CAY5...`).
- `USDC_CONTRACT_ID`: The token contract ID (Currently using Native XLM SAC: `CDLZ...`).
- `ORACLE_SECRET_KEY`: The private key of the Oracle account.
- `AGENCY_ADDRESS`: The Stellar address that receives the funds upon release.

---

## Running Locally

1. Install dependencies: `npm install`
2. Create and configure `.env` based on `.env.example`.
3. Start the dev server: `npm run dev`
