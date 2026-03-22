// components/PrivyClientProvider.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#0038FF',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}