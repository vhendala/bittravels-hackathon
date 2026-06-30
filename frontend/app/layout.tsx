import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { FlightProvider } from '@/contexts/FlightContext'
import PrivyProviders from '@/components/PrivyProviders'

export const metadata: Metadata = {
  title: 'Bit Travels - Compre sua viagem com pagamento protegido',
  description: 'Uma das primeiras agências do mundo a aceitar criptomoedas. Segurança jurídica, atendimento personalizado e a liberdade de pagar sua viagem com bitcoin, USDT, outras criptomoedas, cartão, boleto ou Pix.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body>
        <LanguageProvider>
          <FlightProvider>
            <PrivyProviders>
                {children}
            </PrivyProviders>
          </FlightProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}

