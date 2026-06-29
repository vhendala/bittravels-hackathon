# Bit Travels — Backend Documentation

> **Stack:** Node.js · Express · TypeScript · ts-node-dev · Amadeus API · Stellar Friendbot

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Server Bootstrap (`server.ts`)](#server-bootstrap-serverts)
5. [Routes](#routes)
   - [GET/POST `/api/flights/search`](#getpost-apiflightssearch)
   - [GET `/api/locations/resolve`](#get-apilocationsresolve)
   - [POST/GET `/api/bookings`](#postget-apibookings)
   - [POST `/api/bookings/confirm/:bookingId`](#post-apibookingsconfirmbookingid)
   - [POST `/api/receive-reservation`](#post-apireceive-reservation)
   - [POST `/api/funding`](#post-apifunding)
   - [GET `/health`](#get-health)
6. [Services](#services)
   - [Amadeus Service](#amadeus-service-amadeust)
   - [Reservation Sanitizer](#reservation-sanitizer-reservationsanitizerts)
7. [Middleware](#middleware)
   - [API Key Auth](#api-key-auth-authts)
8. [Soroban Oracle Service](#soroban-oracle-service-sorobants)
8. [Security Model](#security-model)
9. [In-Memory Flight Cache](#in-memory-flight-cache)
10. [Environment Variables](#environment-variables)
11. [Running Locally](#running-locally)

---

## Overview

The Bit Travels backend is a **stateless Node.js/Express API** written in TypeScript. It has two primary responsibilities:

1. **Flight Search Orchestration** — Acts as a secure proxy between the frontend and the **Amadeus GDS API**, applying business rules (markup, caching, rate limiting) and preventing direct scraping of the Amadeus credentials.

2. **Stellar Settlement Orchestration** — Exposes a `/api/funding` endpoint that receives a user's Stellar public address (derived by Privy on the frontend) and calls the **Stellar Friendbot** to fund the account on Testnet, enabling it to pay transaction fees on the Soroban network.

> **No database.** The backend is intentionally stateless. All booking persistence is handled either on-chain (via Soroban) or in the frontend state. No SQL/NoSQL connection is required.

---

## Architecture

```
Frontend (Next.js)
     │  x-api-key header (injected by Edge Middleware)
     ▼
Express Server (port 5000)
     │
     ├─ Helmet        → HTTP security headers
     ├─ CORS          → Origin whitelist (bittravels.com.br + localhost:3000)
     ├─ Rate Limiting → General (100/15min) + Search (20/10min)
     ├─ API Key Guard → requireApiKey middleware (blocks scrapers)
     │
     ├─ /api/flights     → amadeus.ts (token cache + markup + GDS search)
     ├─ /api/locations   → amadeus.ts (IATA/city autocomplete)
     ├─ /api/bookings    → bookings.ts (mocked — no DB)
     ├─ /api/receive-reservation → reservation_webhook.ts (sanitize + ack)
     └─ /api/funding     → funding.ts (Stellar Friendbot proxy)
```

---

## Directory Structure

```
backend/
└── src/
    ├── server.ts                        # App bootstrap, middleware stack, route registration
    ├── routes/
    │   ├── flights.ts                   # Flight search endpoints (GET + POST)
    │   ├── locations.ts                 # IATA / city autocomplete endpoint
    │   ├── bookings.ts                  # Booking creation and retrieval (mocked)
    │   ├── reservation_webhook.ts       # Incoming reservation webhook from frontend
    │   └── funding.ts                   # Stellar Friendbot funding orchestration
    ├── services/
    │   ├── amadeus.ts                   # Amadeus API token management, flight search, branded fares
    │   └── reservationSanitizer.ts      # Input sanitization and field validation
    └── middleware/
        └── auth.ts                      # x-api-key validation middleware
```

---

## Server Bootstrap (`server.ts`)

The entry point of the application. It:

1. Calls `dotenv.config()` **before any route imports** to guarantee environment variables are loaded when services initialize.
2. Sets `trust proxy: 1` so Express correctly reads the real client IP forwarded by Nginx in production (required for accurate rate limiting).
3. Mounts the full middleware stack in order:
   - `helmet()` — Sets secure HTTP response headers (CSP, HSTS, XSS protection, etc.)
   - `cors()` — Restricts `Origin` header to the official domain in production; adds `localhost:3000` in development.
   - `express.json({ limit: '1mb' })` — Caps request body size to mitigate large-payload DoS attacks.
   - `rateLimit` (global + per-route) — Two tiers of rate limiting.
   - `requireApiKey` — Applied only to the Amadeus-backed routes (flights, bookings, locations).
4. Registers all routers and starts listening.

---

## Routes

### GET/POST `/api/flights/search`

**File:** `src/routes/flights.ts`

| Method | Route | Protected | Rate Limit |
|---|---|---|---|
| `POST` | `/api/flights/search` | ✅ API Key | 50 req / 15 min |
| `GET` | `/api/flights/search` | ✅ API Key | 50 req / 15 min |

The POST variant is the primary endpoint and supports all search types. The GET variant exists for backward compatibility.

**Supported search modes:**

| Mode | Required body fields |
|---|---|
| One-way | `origin`, `destination`, `departureDate` |
| Round-trip | `origin`, `destination`, `departureDate`, `returnDate` |
| Multi-city | `segments: [{origin, destination, date}]` |

**Passenger types accepted:**
- Adults (`≥12 years`)
- Children (`2–11 years`, with individual age via `childrenAges[]`)
- Infants (`<2 years`, lap babies, associated to an adult)

**Business logic applied:**
- A **+10% agency markup** (`COMMISSION_RATE = 1.10`) is applied to all price fields before returning results. The raw Amadeus price is never exposed to the client.
- Results are **sorted by ascending price**.
- The number of infants may not exceed the number of adults (Amadeus constraint).

**In-memory cache:** Results are cached per unique search configuration (MD5 hash of sorted params) for **15 minutes**. Cache hits return in under 20ms and never consume Amadeus API quota.

---

### GET `/api/locations/resolve`

**File:** `src/routes/locations.ts`

| Method | Route | Protected | Rate Limit |
|---|---|---|---|
| `GET` | `/api/locations/resolve` | ✅ API Key | 20 req / 10 min |

Used by the `CityAutocomplete` component in the frontend for IATA/city search and by `FlightContext` to resolve IATA codes to human-readable city names.

**Query parameters:**

| Param | Description |
|---|---|
| `keyword` | City or airport name for autocomplete |
| `iatas` | Comma-separated IATA codes for batch resolution |

Internally delegates to the `searchLocations()` function in `amadeus.ts`.

---

### POST/GET `/api/bookings`

**File:** `src/routes/bookings.ts`

| Method | Route | Protected |
|---|---|---|
| `POST` | `/api/bookings` | ✅ API Key |
| `GET` | `/api/bookings/:bookingId` | ✅ API Key |
| `GET` | `/api/bookings` | ✅ API Key |

> **Note:** Database integration has been intentionally removed. All endpoints return **mocked successful responses**. Booking persistence is delegated to the Soroban smart contract on-chain.

The `POST` endpoint still performs full **Zod schema validation** on the request body, rejecting malformed payloads with detailed error information to prevent null-read crashes (DoS protection).

A unique `bookingId` is generated deterministically as `BT<timestamp><random>` and returned to the client.

---

### POST `/api/bookings/confirm/:bookingId`

| Method | Route | Protected |
|---|---|---|
| `POST` | `/api/bookings/confirm/:bookingId` | ✅ API Key |

**Purpose:** Acts as the backend trigger to finalize a booking after the airline issues the e-ticket.
This endpoint calls the Soroban Service to securely sign and submit a `release_funds` transaction to the blockchain, which unlocks the USDC from the escrow and sends it to the travel agency.

**Response:**
```json
{
  "success": true,
  "message": "Booking confirmed and funds released to agency.",
  "txHash": "..."
}
```

---

### POST `/api/receive-reservation`

**File:** `src/routes/reservation_webhook.ts`

| Method | Route | Protected | Rate Limit |
|---|---|---|---|
| `POST` | `/api/receive-reservation` | ❌ (open) | 10 req / 15 min |

Webhook endpoint that receives reservation objects from the frontend (or external integrators). It applies:

1. **Customer data sanitization** via `reservationSanitizer.ts` — strips empty strings, placeholder values (`--`), and normalizes dates to `YYYY-MM-DD`.
2. **Required field validation** — returns `400` with the list of missing fields if `internal_id`, `customer.first_name`, or `flight.route` are absent.
3. **Acknowledgement** — returns `200 { success: true }` after sanitization passes.

> **No data is persisted.** The endpoint is stateless and acts purely as a validation and acknowledgement layer.

---

### POST `/api/funding`

**File:** `src/routes/funding.ts`

| Method | Route | Protected |
|---|---|---|
| `POST` | `/api/funding` | ❌ (open) |

**Purpose:** Enables new Stellar accounts (derived by Privy on the frontend) to participate in the Soroban network by funding them with testnet XLM.

**Request body:**
```json
{ "address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" }
```

**Flow:**
1. Validates that `address` is present in the body.
2. Calls `https://friendbot.stellar.org/?addr=<address>` (Stellar's official Testnet faucet).
3. Returns the Friendbot response on success, or a `502` with the error details on failure.

> **Security guarantee:** This endpoint handles **only public addresses**. The private key is managed exclusively within Privy's MPC infrastructure on the client side and is never transmitted to the backend.

---

### GET `/health`

```json
{ "status": "ok" }
```

Minimal health check for load balancer / uptime monitoring. Does not expose application version or stack information.

---

## Services

### Amadeus Service (`amadeus.ts`)

The Amadeus integration layer. Handles all external communication with the Amadeus REST API.

#### Token Management

Amadeus uses OAuth2 client credentials. The token is **cached in memory** with a 60-second safety margin before expiry (`tokenExpiry = Date.now() + (expires_in - 60) * 1000`). All concurrent requests share the same valid token.

```
AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET
    → POST https://test.api.amadeus.com/v1/security/oauth2/token
    → access_token (cached, auto-refreshed)
```

#### `searchFlights(params)`

Builds and executes a `POST` request to `v2/shopping/flight-offers`. Supports one-way, round-trip, and native multi-city (multiple `originDestinations` in one request). Applies the `applyMarkup()` function to all price fields before returning.

#### `getBrandedFares(flightOffer)`

Calls `v1/shopping/flight-offers/upselling` to fetch available fare families for a specific offer. Returns fare family name, baggage allowance, seat selection policy, and refund flexibility. Returns an empty array if the airline does not support branded fares (graceful fallback).

#### `searchLocations(keyword)`

Calls `v1/reference-data/locations` with `subType=AIRPORT,CITY` to return up to 10 IATA location matches for autocomplete.

#### `applyMarkup(offers)`

Deep-clones the raw Amadeus offers and multiplies `price.total`, `price.base`, and `price.grandTotal` (plus per-traveler pricing) by `1.10`. The original Amadeus price never leaves the backend.

---

### Reservation Sanitizer (`reservationSanitizer.ts`)

Pure utility functions with no side effects. Used by the reservation webhook to clean incoming data.

| Function | Description |
|---|---|
| `sanitizeCustomer(raw)` | Normalises all customer fields; converts empty strings and `--` to `null`; validates date format |
| `getMissingFields(id, customer, flight)` | Returns an array of required field names that are absent or empty |
| `sanitizeField(value)` | Converts `''`, `'--'`, `null`, and `undefined` to `null`; returns trimmed string otherwise |
| `sanitizeBirthDate(date)` | Accepts only `YYYY-MM-DD` format; returns `null` for any other value |

---

## Soroban Oracle Service (`soroban.ts`)

Located at `backend/src/services/soroban.ts`, this service serves as the **Oracle** for the Bit Travels platform.

When a booking is confirmed, this service:
1. Loads the `ORACLE_SECRET_KEY` from the environment.
2. Formats the booking ID and Agency address into `ScVal` types.
3. Builds a Soroban transaction to invoke `release_funds` on the Escrow contract.
4. Performs a mandatory `simulateTransaction` RPC call to gather execution footprints and calculate fees.
5. Assembles and signs the final transaction safely on the backend.
6. Submits it to the Stellar network and polls until the transaction is successfully confirmed on the ledger.

This architecture ensures that only the backend can authorize the release of funds, preventing premature withdrawals by the agency while keeping the user's funds safe.

---

## Middleware

### API Key Auth (`middleware/auth.ts`)

Protects the Amadeus-backed routes (`/api/flights`, `/api/bookings`, `/api/locations`) from direct external access.

**Mechanism:** Checks the `x-api-key` request header against the `BITTRAVELS_API_KEY` environment variable.

- If the env var is **not set**, a warning is logged and the request is allowed through (safe for initial local setup).
- If the env var **is set** and the key doesn't match or is absent, the request is rejected with `401 Unauthorized` and the offending IP is logged.

The matching key is injected transparently on the frontend side by the Next.js Edge Middleware (`middleware.ts`) before each API call, so legitimate browser requests always carry it without user involvement.

---

## Security Model

| Layer | Control | Mechanism |
|---|---|---|
| HTTP Headers | `helmet()` | Prevents XSS, clickjacking, MIME sniffing |
| Origin Control | `cors({ origin: allowedOrigins })` | Only the official domain and localhost in dev |
| Payload Size | `express.json({ limit: '1mb' })` | Blocks oversized body DoS attacks |
| General Rate Limit | 100 req / 15 min / IP | All `/api/*` routes |
| Search Rate Limit | 20 req / 10 min / IP | Flight search + location resolve |
| Webhook Rate Limit | 10 req / 15 min / IP | Reservation webhook |
| Scraper Defense | `requireApiKey` middleware | Blocks requests without the correct shared secret |
| Credential Isolation | Environment variables only | Amadeus and Privy secrets never hardcoded |
| Key Privacy | Backend never handles private keys | Privy MPC keeps the Stellar private key on the client |
| IP Detection | `trust proxy: 1` | Accurate IP from `X-Forwarded-For` (Nginx) |

---

## In-Memory Flight Cache

To protect Amadeus API quota (which is rate-limited and metered), all flight search results are cached in a `Map<string, CacheEntry>` per process.

- **Cache key:** MD5 hash of the search parameters object (keys sorted for determinism).
- **TTL:** 15 minutes (`CACHE_TTL_MS = 15 * 60 * 1000`).
- **Scope:** Per-process (resets on server restart). No shared cache (Redis, etc.) is used.
- **Behaviour:** Cache hits are logged and return in under 20ms. The Amadeus API is only called on cache miss.

> In a multi-instance deployment behind a load balancer, each instance maintains its own cache. This is an acceptable trade-off for the current scale.

---

## Environment Variables

> **File:** `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `AMADEUS_CLIENT_ID` | ✅ | Amadeus API OAuth2 client ID |
| `AMADEUS_CLIENT_SECRET` | ✅ | Amadeus API OAuth2 client secret |
| `PORT` | ❌ | HTTP port (default: `5000`) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `BITTRAVELS_API_KEY` | ⚠️ Recommended | Shared secret for the API key guard middleware |
| `PRIVY_APP_SECRET` | ⚠️ Recommended | Privy App Secret for server-side JWT verification |
| `STELLAR_NETWORK` | ✅ | `testnet` ou `public` |
| `STELLAR_RPC_URL` | ✅ | Soroban RPC endpoint URL (ex: `https://soroban-testnet.stellar.org`) |
| `SOROBAN_CONTRACT_ID` | ✅ | Escrow contract ID na blockchain (ex: `CAA7ON...`) |
| `ORACLE_SECRET_KEY` | ✅ | Chave privada do backend usada para assinar `release_funds` |
| `AGENCY_ADDRESS` | ✅ | Endereço Stellar da agência de viagens recebendo o USDC |

> **Nota sobre Soroban:** Os valores para o Contrato Soroban, Chave do Oráculo e Endereço da Agência foram gerados e populados durante o deploy na Testnet.

---

## Running Locally

```bash
# From the project root
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET (get at developers.amadeus.com)

# Start the development server (hot reload with ts-node-dev)
npm run dev
# → http://localhost:5000
```

**Available scripts:**

| Script | Command | Description |
|---|---|---|
| `dev` | `ts-node-dev --respawn --transpile-only src/server.ts` | Development server with hot reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/server.js` | Run compiled production build |
