'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

export default function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
