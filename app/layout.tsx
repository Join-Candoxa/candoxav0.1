// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PrivyClientProvider from '@/components/PrivyClientProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Candoxa — Digital Identity On-Chain',
  description: 'Own your digital identity permanently.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyClientProvider>
          {children}
        </PrivyClientProvider>
      </body>
    </html>
  )
}