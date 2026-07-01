'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

export default function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  // Sem App ID configurado (ex: rodando localmente só para a landing page),
  // o Privy SDK lança erro ao inicializar — então pulamos o provider inteiro.
  if (!appId) {
    return <>{children}</>;
  }

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
