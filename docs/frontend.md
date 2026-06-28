# Bit Travels — Frontend Documentation

> **Stack:** Next.js 14 · React 18 · TypeScript · Tailwind CSS · Framer Motion · Privy SDK

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Pages & Routing](#pages--routing)
5. [Components](#components)
6. [State Management & Contexts](#state-management--contexts)
7. [Authentication & Embedded Wallets (Privy)](#authentication--embedded-wallets-privy)
8. [Edge Middleware](#edge-middleware)
9. [Environment Variables](#environment-variables)
10. [API Proxy & Backend Communication](#api-proxy--backend-communication)
11. [Dependencies](#dependencies)
12. [Running Locally](#running-locally)

---

## Overview

The Bit Travels frontend is a **Next.js 14 App Router** application that serves as the consumer-facing travel booking platform. It integrates directly with:

- **Amadeus GDS** (via the backend proxy) to search real-time flight offers worldwide.
- **Privy SDK** to provide invisible, non-custodial **Stellar embedded wallets** — the user signs in with email or social login and gets a full Stellar keypair managed via MPC, without ever seeing a seed phrase.
- The **Bit Travels Backend** for all flight search, booking creation, location resolution, and Stellar Friendbot funding orchestration.

The application is fully **stateless** on the server side — no user data is persisted in the frontend layer. All sensitive keys are injected at the Edge layer via middleware and never exposed to the browser bundle.

---

## Architecture

```
Browser (Client Components)
     │
     ├─ PrivyProviders (session + embedded wallet lifecycle)
     ├─ LanguageContext (i18n, PT-BR / EN)
     └─ FlightContext (search results, selected flight, form state)
     │
     ▼
Next.js Edge Middleware (middleware.ts)
     │  Injects x-api-key silently before forwarding to backend
     ▼
Next.js Rewrites (next.config.js)
     │  /api/* → http://localhost:5000/api/*
     ▼
Bit Travels Backend (Node.js / Express)
```

---

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx            # Root layout: wraps all providers (Language, Flight, Privy)
│   ├── page.tsx              # Landing page (renders all homepage sections)
│   ├── globals.css           # Global styles and Tailwind base
│   └── checkout/
│       └── page.tsx          # Multi-step checkout flow (passengers, contact, payment)
├── components/
│   ├── PrivyProviders.tsx    # Client component: initialises PrivyProvider
│   ├── PrivyLogin.tsx        # Login UI + Stellar wallet creation + Friendbot funding
│   ├── FlightSearch.tsx      # Full-featured flight search panel (one-way, round-trip, multi-city)
│   ├── CityAutocomplete.tsx  # IATA / city autocomplete input with debounce
│   ├── PassengerSelector.tsx # Passenger count picker (adults, children, infants)
│   ├── PassengerForm.tsx     # Per-passenger data entry form
│   ├── ContactForm.tsx       # Lead contact details form
│   ├── PaymentForm.tsx       # Payment method selection and checkout summary
│   ├── ComparisonTable.tsx   # Crypto vs. traditional payment comparison
│   ├── Header.tsx            # Navigation bar
│   ├── Hero.tsx              # Landing hero section
│   ├── Services.tsx          # Services highlight section
│   ├── ValueProposition.tsx  # Value proposition cards
│   ├── Testimonials.tsx      # Customer testimonials carousel
│   ├── FAQ.tsx               # Frequently Asked Questions accordion
│   ├── Footer.tsx            # Site footer
│   └── FloatingWhatsApp.tsx  # Floating WhatsApp CTA button
├── contexts/
│   ├── FlightContext.tsx     # Global flight search state (results, selection, form persistence)
│   └── LanguageContext.tsx   # Full i18n context with PT-BR and EN string maps
├── config/
│   └── constants.ts          # Shared frontend constants
├── utils/
│   └── detectUserLanguage.ts # Browser language detection utility
├── middleware.ts              # Next.js Edge Middleware (API key injection)
├── next.config.js            # Next.js config (rewrites proxy + webpack stubs for Privy)
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── .env                      # Environment variables (not committed)
```

---

## Pages & Routing

### `/` — Landing Page (`app/page.tsx`)

The main landing page renders all marketing sections in sequence:

| Section | Component |
|---|---|
| Navigation bar | `Header` |
| Hero banner | `Hero` |
| Flight search panel | `FlightSearch` |
| Value proposition | `ValueProposition` |
| Services overview | `Services` |
| Crypto vs. traditional comparison | `ComparisonTable` |
| Customer testimonials | `Testimonials` |
| FAQ | `FAQ` |
| Footer | `Footer` |
| WhatsApp floating button | `FloatingWhatsApp` |

### `/checkout` — Booking Checkout (`app/checkout/page.tsx`)

A multi-step wizard that guides the user from flight selection to payment. Steps:

1. **Passenger details** — individual form per adult/child/infant
2. **Contact details** — lead passenger contact info
3. **Payment** — cryptocurrency payment method selection and final summary

The checkout page reads the `selectedFlight` and `searchParams` from `FlightContext` to pre-populate the booking summary.

---

## Components

### `FlightSearch.tsx`

The most complex component in the application. Handles:

- **Trip types:** One-Way, Round-Trip, and Multi-City (up to N segments)
- **Passenger configuration:** adults, children (with individual age inputs), and infants
- **IATA autocomplete** via `CityAutocomplete` backed by `GET /api/locations/resolve`
- **In-memory results rendering** with price sorting, segment breakdown, and flight duration
- **Branded Fares:** Calls the backend to fetch fare families (baggage, flexibility tiers) for a selected offer
- On selecting a flight, it persists the choice and form state to `FlightContext` and navigates to `/checkout`

### `CityAutocomplete.tsx`

Debounced IATA/city search input that queries `GET /api/locations/resolve?keyword=...`. Displays results in a dropdown with city name, country, and IATA code.

### `PrivyLogin.tsx`

- Uses `usePrivy()` to access the session state and `login()` / `logout()` methods.
- Uses `useCreateWallet({ chainType: 'stellar' })` from `@privy-io/react-auth/extended-chains` to derive a **Stellar keypair** via MPC immediately after the user authenticates.
- Displays the derived public address (`G...`) to the user.
- Provides a "Request Testnet Funds" button that calls `POST /api/funding` on the backend, which triggers the **Stellar Friendbot** to fund the account with 10,000 XLM on Testnet.

> **Security note:** The user's private key never leaves the Privy MPC infrastructure. The backend receives only the public address.

---

## State Management & Contexts

### `FlightContext` (`contexts/FlightContext.tsx`)

A React Context that acts as the global in-memory store for the flight booking flow. It persists state across navigation (search → results → checkout) without any browser storage.

| State | Type | Purpose |
|---|---|---|
| `selectedFlight` | `FlightOffer \| null` | The flight the user clicked to book |
| `searchParams` | `SearchParams \| null` | The active search criteria |
| `searchResults` | `FlightOffer[]` | The last batch of results from the API |
| `searchFormState` | `SearchFormState \| null` | Full form state to restore on back-navigation |
| `locationNames` | `Record<string, {...}>` | IATA → city/country name cache |

Also exposes `resolveLocationNames(iatas[])` to lazily fetch and cache city names for display.

### `LanguageContext` (`contexts/LanguageContext.tsx`)

Provides PT-BR / EN internationalisation across all components. Auto-detects the user's browser language via `utils/detectUserLanguage.ts`. All UI strings are declared inside this context — no external i18n library is used.

---

## Authentication & Embedded Wallets (Privy)

Privy is configured as a **Tier 2 chain** integration for **Stellar**. The SDK manages the user lifecycle and MPC key shares transparently.

### Configuration (`components/PrivyProviders.tsx`)

```tsx
<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  config={{
    loginMethods: ['email'],
    appearance: { theme: 'light', accentColor: '#676FFF' },
  }}
>
```

### Stellar Wallet Flow

```
User clicks "Login" 
  → Privy modal (email OTP)
    → User authenticated
      → useEffect detects no Stellar wallet
        → createWallet({ chainType: 'stellar' }) called
          → MPC key shares generated server-side
            → Public address returned and displayed
              → User clicks "Request Funds"
                → POST /api/funding { address: "GXXX..." }
                  → Backend calls Friendbot
                    → Account activated on Testnet
```

### Webpack Stubs (Optional Peer Dependencies)

Privy's SDK bundles optional integrations for Solana, Ethereum, Farcaster, and Stripe onramp. Since the project uses only Stellar, the following modules are stubbed out in `next.config.js` to prevent build errors:

```js
'@farcaster/mini-app-solana': false,
'@farcaster/frame-wagmi-connector': false,
'@farcaster/frame-core': false,
'@stripe/crypto': false,
'@stripe/stripe-js': false,
'@solana/web3.js': false,
'@solana/wallet-adapter-base': false,
```

---

## Edge Middleware

**File:** `middleware.ts`

Next.js Edge Middleware runs on Vercel's Edge Runtime (or Node.js locally) before every request that matches `/api/*`. Its sole responsibility is to **inject the `x-api-key` header** silently on behalf of the browser:

```
Browser request → GET /api/flights/search
      ↓ (middleware intercepts)
      ↓ Adds header: x-api-key: <BITTRAVELS_API_KEY>
      ↓
Next.js Rewrite → http://backend:5000/api/flights/search
```

This prevents the API key from ever appearing in the browser's network inspector or bundle.

---

## Environment Variables

> **File:** `frontend/.env`

| Variable | Visibility | Description |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Public | Base URL for direct backend calls (e.g., funding) |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Public | Stellar network (`TESTNET` or `PUBLIC`) |
| `NEXT_PUBLIC_RPC_URL` | Public | Soroban RPC endpoint |
| `NEXT_PUBLIC_CONTRACT_ID` | Public | Deployed Soroban Escrow contract address |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Public | Privy App ID (from dashboard.privy.io) |
| `BITTRAVELS_API_KEY` | **Server-only** | Shared secret injected by Edge Middleware |
| `API_URL` | **Server-only** | Internal backend URL for the Next.js proxy rewrite |

> Variables without the `NEXT_PUBLIC_` prefix are **never** exposed to the browser.

---

## API Proxy & Backend Communication

All `/api/*` calls from the browser are proxied to the backend via the `rewrites` config in `next.config.js`:

```js
{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }
```

This means the browser always calls its own origin (`/api/...`), and Next.js transparently forwards the request to the backend with the injected API key — the actual backend URL is never revealed to the client.

The only direct (non-proxied) call is `POST /api/funding`, which uses `NEXT_PUBLIC_BACKEND_URL` to hit the funding endpoint.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 14.2.5 | App Router framework |
| `react` / `react-dom` | ^18.3.1 | UI library |
| `@privy-io/react-auth` | ^3.32.2 | Auth + Stellar embedded wallets |
| `framer-motion` | ^11.3.19 | Animations and transitions |
| `lucide-react` | ^0.427.0 | Icon library |
| `tailwindcss` | ^3.4.7 | Utility-first CSS |
| `typescript` | ^5.5.4 | Type safety |

---

## Running Locally

```bash
# From the project root
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in NEXT_PUBLIC_PRIVY_APP_ID and other required values

# Start the development server
npm run dev
# → http://localhost:3000
```

> The backend must also be running on port 5000 for API calls to succeed. See [backend documentation](./backend.md).
