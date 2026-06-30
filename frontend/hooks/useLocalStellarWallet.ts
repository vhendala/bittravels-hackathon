'use client';

import { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { usePrivy } from '@privy-io/react-auth';

const STORAGE_KEY = 'hackathon_stellar_secret';

export function useLocalStellarWallet() {
    const { authenticated } = usePrivy();
    const [keypair, setKeypair] = useState<StellarSdk.Keypair | null>(null);

    useEffect(() => {
        // Only manage the wallet if the user is logged in
        if (!authenticated) {
            setKeypair(null);
            return;
        }

        const storedSecret = localStorage.getItem(STORAGE_KEY);
        
        if (storedSecret) {
            try {
                const kp = StellarSdk.Keypair.fromSecret(storedSecret);
                setKeypair(kp);
            } catch (e) {
                console.error('Invalid stored secret key. Generating a new one.');
                const newKp = StellarSdk.Keypair.random();
                localStorage.setItem(STORAGE_KEY, newKp.secret());
                setKeypair(newKp);
            }
        } else {
            const newKp = StellarSdk.Keypair.random();
            localStorage.setItem(STORAGE_KEY, newKp.secret());
            setKeypair(newKp);
        }
    }, [authenticated]);

    return { keypair, publicKey: keypair?.publicKey() };
}
