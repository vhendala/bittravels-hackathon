//! # Bit Travels Escrow Contract
//!
//! A minimal, auditable Soroban escrow for the travel settlement layer.
//!
//! ## Settlement Flow
//!
//! ```text
//! Client                   Contract                  Oracle (Backend)
//!   │                          │                          │
//!   │── lock_funds() ─────────▶│                          │
//!   │   (approve token SAC     │                          │
//!   │    transfer first)       │── holds USDC ────────────│
//!   │                          │                          │
//!   │                          │     (ticket issued)      │
//!   │                          │◀─── release_funds() ─────│
//!   │                          │     (oracle signs)       │
//!   │                          │                          │
//!   │                          │── transfer USDC ─────────▶ Agency
//! ```
//!
//! ## Security Model
//!
//! - **`lock_funds`** requires the *client* to authorise the call. This means
//!   the client's Stellar keypair (managed by Privy MPC) must sign the
//!   transaction, preventing any third party from locking someone else's funds.
//!
//! - **`release_funds`** requires the *oracle* (our backend key) to authorise.
//!   The oracle address is set once at deployment via the constructor and stored
//!   in `Instance` storage. Only that specific address can release.
//!
//! - **`refund`** lets the client reclaim funds if the oracle never releases
//!   (dispute / no-show protection). Requires client auth.
//!
//! - Funds are held as USDC (or any SEP-41 / SAC token) inside the contract
//!   account using the standard `soroban-sdk::token::Client` interface.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    token::Client as TokenClient,
    Address, Env, Symbol,
};

// ── Error Codes ───────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowError {
    /// Contract has already been initialised (constructor ran).
    AlreadyInitialized  = 1,
    /// A reservation with this ID already exists.
    ReservationExists   = 2,
    /// No reservation found for the given ID.
    ReservationNotFound = 3,
    /// Funds have already been released for this reservation.
    AlreadyReleased     = 4,
    /// Funds have already been refunded for this reservation.
    AlreadyRefunded     = 5,
    /// The provided amount is zero or negative.
    InvalidAmount       = 6,
}

// ── Storage Keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Instance-level: the oracle address that can release funds (our backend).
    Oracle,
    /// Instance-level: the ERC-20 / SAC token address (e.g. USDC on Testnet).
    Token,
    /// Persistent per-reservation data, keyed by an opaque booking ID Symbol.
    Reservation(Symbol),
}

// ── Data Types ────────────────────────────────────────────────────────────────

/// State of a single travel reservation held in escrow.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reservation {
    /// Stellar address of the traveller (derived by Privy MPC on the client).
    pub client: Address,
    /// Amount of tokens locked (USDC uses 7 decimal places on Stellar,
    /// so 1 USDC = 10_000_000 strobes).
    pub amount: i128,
    /// True once `lock_funds` completes successfully.
    pub is_locked: bool,
    /// True once the oracle calls `release_funds`.
    pub is_released: bool,
    /// True once the client calls `refund`.
    pub is_refunded: bool,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    // ── Constructor ───────────────────────────────────────────────────────────

    /// Called **once** at deployment time (Protocol 22 constructor pattern).
    ///
    /// # Arguments
    /// - `oracle`  – The backend wallet that is authorised to release funds.
    ///              Keep this key in an HSM or a secure server environment.
    /// - `token`   – The SAC / SEP-41 token address for USDC (or any stablecoin).
    ///
    /// # Security
    /// The Soroban runtime ensures `__constructor` can only run at creation
    /// time, making it impossible to call again and change the oracle.
    pub fn __constructor(env: Env, oracle: Address, token: Address) {
        // Store oracle and token in instance storage (lives with the contract).
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Token,  &token);

        // Extend instance TTL to ~30 days so the contract doesn't get archived.
        env.storage().instance().extend_ttl(17_280, 518_400);
    }

    // ── lock_funds ────────────────────────────────────────────────────────────

    /// Lock the client's USDC tokens inside the contract.
    ///
    /// **Before** calling this function the client must have called
    /// `token.approve(client, contract_address, amount)` so the SAC can pull
    /// the funds on their behalf.
    ///
    /// # Security
    /// `client.require_auth()` ensures only the actual owner of that Stellar
    /// keypair (signed by Privy MPC) can lock funds — no third party can lock
    /// someone else's money without their signature.
    ///
    /// # Arguments
    /// - `booking_id` – Short opaque ID (max 32 chars) matching the backend
    ///                  booking reference (e.g. `symbol_short!("BT0042")`).
    /// - `client`     – Traveller's Stellar address.
    /// - `amount`     – Token amount in the token's native units.
    pub fn lock_funds(
        env:        Env,
        booking_id: Symbol,
        client:     Address,
        amount:     i128,
    ) -> Result<(), EscrowError> {
        // ── Validation ─────────────────────────────────────────────────────
        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let key = DataKey::Reservation(booking_id.clone());

        // Prevent double-booking: each booking_id can only be locked once.
        if env.storage().persistent().has(&key) {
            return Err(EscrowError::ReservationExists);
        }

        // ── Authorization ──────────────────────────────────────────────────
        // The client must sign this transaction. Because Privy manages the
        // private key via MPC, this translates to a server-side signing
        // approval in the Privy SDK before submission.
        client.require_auth();

        // ── Pull tokens into the contract ──────────────────────────────────
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token = TokenClient::new(&env, &token_address);

        // transfer_from: moves `amount` from `client` → this contract.
        // Requires the client to have pre-approved this contract as a spender.
        token.transfer(&client, &env.current_contract_address(), &amount);

        // ── Persist reservation state ──────────────────────────────────────
        let reservation = Reservation {
            client:      client.clone(),
            amount,
            is_locked:   true,
            is_released: false,
            is_refunded: false,
        };

        env.storage().persistent().set(&key, &reservation);

        // Extend reservation TTL to ~30 days (prevent archival during a trip).
        env.storage().persistent().extend_ttl(&key, 17_280, 518_400);

        // ── Emit Event ─────────────────────────────────────────────────────
        env.events().publish(
            (Symbol::new(&env, "funds_locked"), booking_id),
            (client, amount),
        );

        Ok(())
    }

    // ── release_funds ─────────────────────────────────────────────────────────

    /// Transfer the locked USDC from the contract to the travel agency.
    ///
    /// **Only** the oracle (our backend) can call this. The oracle calls
    /// `release_funds` after it has confirmed the e-ticket was issued
    /// successfully by the airline GDS.
    ///
    /// # Security
    /// `oracle.require_auth()` means the transaction must carry a valid
    /// signature from the oracle's private key. The oracle key is stored at
    /// construction time and cannot be changed without a contract upgrade.
    ///
    /// # Arguments
    /// - `booking_id` – The ID of the reservation to release.
    /// - `agency`     – The travel agency address that will receive the funds.
    pub fn release_funds(
        env:        Env,
        booking_id: Symbol,
        agency:     Address,
    ) -> Result<(), EscrowError> {
        // ── Oracle Authorization ───────────────────────────────────────────
        // Load the stored oracle address and demand its signature.
        // Any transaction not signed by the oracle will be rejected by the
        // Stellar network before this code even runs past this point.
        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        oracle.require_auth();

        // ── Load Reservation ───────────────────────────────────────────────
        let key = DataKey::Reservation(booking_id.clone());

        let mut reservation: Reservation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::ReservationNotFound)?;

        // Guard against double-release and post-refund release.
        if reservation.is_released {
            return Err(EscrowError::AlreadyReleased);
        }
        if reservation.is_refunded {
            return Err(EscrowError::AlreadyRefunded);
        }

        // ── Transfer to Agency ─────────────────────────────────────────────
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token = TokenClient::new(&env, &token_address);

        token.transfer(&env.current_contract_address(), &agency, &reservation.amount);

        // ── Update State ───────────────────────────────────────────────────
        reservation.is_released = true;
        env.storage().persistent().set(&key, &reservation);

        // ── Emit Event ─────────────────────────────────────────────────────
        env.events().publish(
            (Symbol::new(&env, "funds_released"), booking_id),
            (reservation.client, agency, reservation.amount),
        );

        Ok(())
    }

    // ── refund ────────────────────────────────────────────────────────────────

    /// Return the locked tokens to the client.
    ///
    /// Can only be called by the **client** themselves. Intended for dispute
    /// resolution: if the agency fails to issue the ticket and the oracle
    /// never calls `release_funds`, the client can reclaim their funds.
    ///
    /// # Security
    /// `client.require_auth()` ensures only the legitimate traveller can
    /// trigger the refund — the oracle cannot steal funds by calling refund.
    pub fn refund(
        env:        Env,
        booking_id: Symbol,
    ) -> Result<(), EscrowError> {
        // ── Load Reservation ───────────────────────────────────────────────
        let key = DataKey::Reservation(booking_id.clone());

        let mut reservation: Reservation = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::ReservationNotFound)?;

        // ── Client Authorization ───────────────────────────────────────────
        // Only the original client can refund — the oracle cannot drain funds.
        reservation.client.require_auth();

        if reservation.is_released {
            return Err(EscrowError::AlreadyReleased);
        }
        if reservation.is_refunded {
            return Err(EscrowError::AlreadyRefunded);
        }

        // ── Return tokens to client ────────────────────────────────────────
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token = TokenClient::new(&env, &token_address);

        token.transfer(
            &env.current_contract_address(),
            &reservation.client,
            &reservation.amount,
        );

        // ── Update State ───────────────────────────────────────────────────
        reservation.is_refunded = true;
        env.storage().persistent().set(&key, &reservation);

        // ── Emit Event ─────────────────────────────────────────────────────
        env.events().publish(
            (Symbol::new(&env, "funds_refunded"), booking_id),
            (reservation.client.clone(), reservation.amount),
        );

        Ok(())
    }

    // ── View Functions ────────────────────────────────────────────────────────

    /// Returns the full reservation state for a given booking ID.
    /// Read-only — no auth required.
    pub fn get_reservation(
        env:        Env,
        booking_id: Symbol,
    ) -> Result<Reservation, EscrowError> {
        let key = DataKey::Reservation(booking_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(EscrowError::ReservationNotFound)
    }

    /// Returns the oracle address stored at construction time.
    pub fn get_oracle(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Oracle).unwrap()
    }

    /// Returns the token (USDC) address stored at construction time.
    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Events},
        symbol_short,
        token::{Client as TokenClient, StellarAssetClient},
        vec, Address, Env, IntoVal,
    };

    // Helper: deploy a mock SAC token, mint `amount` to `to`, return token address.
    fn create_and_mint_token(env: &Env, admin: &Address, to: &Address, amount: i128) -> Address {
        let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let asset_client = StellarAssetClient::new(env, &token_address);
        asset_client.mint(to, &amount);
        token_address
    }

    // Helper: deploy the escrow and return (contract_id, client_handle).
    fn deploy_escrow(
        env:    &Env,
        oracle: &Address,
        token:  &Address,
    ) -> (Address, EscrowContractClient) {
        let contract_id = env.register(
            EscrowContract,
            (oracle.clone(), token.clone()),
        );
        let client = EscrowContractClient::new(env, &contract_id);
        (contract_id, client)
    }

    // ── lock_funds ────────────────────────────────────────────────────────────

    #[test]
    fn test_lock_funds_happy_path() {
        let env     = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let agency = Address::generate(&env);

        // 100 USDC (7 decimals → 1_000_000_000 units)
        let amount: i128 = 100_000_000_0; // 1_000 USDC
        let token = create_and_mint_token(&env, &oracle, &client, amount);

        let (contract_id, escrow) = deploy_escrow(&env, &oracle, &token);

        let booking_id = symbol_short!("BT0001");
        escrow.lock_funds(&booking_id, &client, &amount).unwrap();

        // Verify reservation state
        let reservation = escrow.get_reservation(&booking_id).unwrap();
        assert_eq!(reservation.client,      client);
        assert_eq!(reservation.amount,      amount);
        assert!(reservation.is_locked);
        assert!(!reservation.is_released);
        assert!(!reservation.is_refunded);

        // Verify contract holds the tokens
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&contract_id), amount);
        assert_eq!(token_client.balance(&client), 0);
    }

    #[test]
    fn test_lock_funds_duplicate_booking_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let amount: i128 = 50_000_000_0;
        let token = create_and_mint_token(&env, &oracle, &client, amount * 2);

        let (_, escrow) = deploy_escrow(&env, &oracle, &token);
        let booking_id  = symbol_short!("BT0002");

        escrow.lock_funds(&booking_id, &client, &amount).unwrap();

        // Second lock on same ID must fail
        let err = escrow.lock_funds(&booking_id, &client, &amount).unwrap_err();
        assert_eq!(err, EscrowError::ReservationExists);
    }

    #[test]
    fn test_lock_funds_zero_amount_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let token  = create_and_mint_token(&env, &oracle, &client, 0);

        let (_, escrow) = deploy_escrow(&env, &oracle, &token);

        let err = escrow.lock_funds(&symbol_short!("BT0003"), &client, &0).unwrap_err();
        assert_eq!(err, EscrowError::InvalidAmount);
    }

    // ── release_funds ─────────────────────────────────────────────────────────

    #[test]
    fn test_release_funds_happy_path() {
        let env = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let agency = Address::generate(&env);
        let amount: i128 = 200_000_000_0;
        let token  = create_and_mint_token(&env, &oracle, &client, amount);

        let (contract_id, escrow) = deploy_escrow(&env, &oracle, &token);
        let booking_id = symbol_short!("BT0010");

        escrow.lock_funds(&booking_id, &client, &amount).unwrap();
        escrow.release_funds(&booking_id, &agency).unwrap();

        let reservation = escrow.get_reservation(&booking_id).unwrap();
        assert!(reservation.is_released);

        // Agency now holds the USDC
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&agency),       amount);
        assert_eq!(token_client.balance(&contract_id),  0);
    }

    #[test]
    fn test_release_funds_double_release_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let agency = Address::generate(&env);
        let amount: i128 = 100_000_000;
        let token  = create_and_mint_token(&env, &oracle, &client, amount);

        let (_, escrow) = deploy_escrow(&env, &oracle, &token);
        let booking_id  = symbol_short!("BT0011");

        escrow.lock_funds(&booking_id, &client, &amount).unwrap();
        escrow.release_funds(&booking_id, &agency).unwrap();

        let err = escrow.release_funds(&booking_id, &agency).unwrap_err();
        assert_eq!(err, EscrowError::AlreadyReleased);
    }

    // ── refund ────────────────────────────────────────────────────────────────

    #[test]
    fn test_refund_happy_path() {
        let env = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let amount: i128 = 75_000_000_0;
        let token  = create_and_mint_token(&env, &oracle, &client, amount);

        let (contract_id, escrow) = deploy_escrow(&env, &oracle, &token);
        let booking_id = symbol_short!("BT0020");

        escrow.lock_funds(&booking_id, &client, &amount).unwrap();
        escrow.refund(&booking_id).unwrap();

        let reservation = escrow.get_reservation(&booking_id).unwrap();
        assert!(reservation.is_refunded);
        assert!(!reservation.is_released);

        // Client gets funds back
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&client),      amount);
        assert_eq!(token_client.balance(&contract_id), 0);
    }

    #[test]
    fn test_cannot_refund_after_release() {
        let env = Env::default();
        env.mock_all_auths();

        let oracle = Address::generate(&env);
        let client = Address::generate(&env);
        let agency = Address::generate(&env);
        let amount: i128 = 50_000_000;
        let token  = create_and_mint_token(&env, &oracle, &client, amount);

        let (_, escrow) = deploy_escrow(&env, &oracle, &token);
        let booking_id  = symbol_short!("BT0021");

        escrow.lock_funds(&booking_id, &client, &amount).unwrap();
        escrow.release_funds(&booking_id, &agency).unwrap();

        let err = escrow.refund(&booking_id).unwrap_err();
        assert_eq!(err, EscrowError::AlreadyReleased);
    }
}
