'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

export default function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        // Auto-create embedded wallet on every login — required for signing Soroban txs
        // 'all-users' ensures existing accounts also get a wallet created
        embeddedWallets: {
          createOnLogin: 'all-users',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
