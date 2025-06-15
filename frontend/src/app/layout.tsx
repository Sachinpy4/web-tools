import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { AppProviders } from '@/components/providers/AppProviders'
import { HeadScripts, BodyScripts, FooterScripts } from '@/components/analytics/DynamicScripts'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

// Only keep essential metadata that won't conflict with page-specific SEO
export const metadata: Metadata = {
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadScripts />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
      </head>
      <body className={inter.className}>
        <BodyScripts />
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AppProviders>
              {children}
            </AppProviders>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <FooterScripts />
      </body>
    </html>
  )
} 