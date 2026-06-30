'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useLocalStellarWallet } from '@/hooks/useLocalStellarWallet';

/**
 * DEBUG ONLY — Shows the local Stellar wallet address at the top of the page.
 * Remove this component before going to production.
 */
export default function WalletDebugBanner() {
    const { authenticated } = usePrivy();
    const { publicKey } = useLocalStellarWallet();

    if (!authenticated) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#1a1a2e',
            color: '#00ff88',
            padding: '6px 16px',
            fontSize: '11px',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #00ff8833',
            flexWrap: 'wrap',
        }}>
            <span style={{ color: '#666', flexShrink: 0 }}>🔐 DEBUG — Local Stellar Wallet:</span>
            {publicKey ? (
                <span style={{ letterSpacing: '0.05em', color: '#00ff88' }}>{publicKey}</span>
            ) : (
                <span style={{ color: '#ff6666' }}>
                    Generating wallet...
                </span>
            )}
        </div>
    );
}

