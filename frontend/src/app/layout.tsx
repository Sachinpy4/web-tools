import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { AppProviders } from '@/components/providers/AppProviders'
import { HeadScripts, BodyScripts, FooterScripts } from '@/components/analytics/DynamicScripts'
import { WebVitals } from '@/components/performance/WebVitals'
import Script from 'next/script'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Changed to false to prevent blocking
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'] // Add fallback fonts
})

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
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Critical resource preloads for performance */}
        <link rel="preload" href="/favicon.svg" as="image" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Inline critical CSS for faster rendering */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html{font-family:Inter,sans-serif;line-height:1.6}
            body{margin:0;padding:0;color:hsl(0 0% 3.9%);background:hsl(0 0% 100%);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
            header{position:fixed;top:0;left:0;right:0;z-index:50;height:4rem;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-bottom:1px solid hsl(0 0% 89.8%)}
            main{padding-top:4rem;min-height:100vh}
            .hero-section{padding:3rem 1rem;text-align:center;background:linear-gradient(135deg,hsl(180 25% 95%) 0%,hsl(210 25% 95%) 50%,hsl(240 25% 95%) 100%)}
            @media (prefers-color-scheme:dark){
              body{color:hsl(0 0% 98%);background:hsl(0 0% 3.9%)}
              header{background:rgba(15,15,15,0.95);border-bottom:1px solid hsl(0 0% 14.9%)}
              .hero-section{background:linear-gradient(135deg,hsl(180 25% 5%) 0%,hsl(210 25% 5%) 50%,hsl(240 25% 5%) 100%)}
            }
          `
        }} />
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
            <WebVitals />
          </ThemeProvider>
        </AuthProvider>
        <FooterScripts />
      </body>
    </html>
  )
} 