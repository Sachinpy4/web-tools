import type { Metadata } from 'next'
// Using system fonts for better performance
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { AppProviders } from '@/components/providers/AppProviders'
import { HeadScripts, BodyScripts, FooterScripts } from '@/components/analytics/DynamicScripts'
import { WebVitals } from '@/components/performance/WebVitals'
import Script from 'next/script'

// Using system font stack for optimal performance
const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

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
        {/* Inline critical CSS for faster rendering */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.6}
            body{margin:0;padding:0;color:hsl(0 0% 3.9%);background:hsl(0 0% 100%);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden}
            *{box-sizing:border-box}
            header{position:fixed;top:0;left:0;right:0;z-index:50;height:4rem;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-bottom:1px solid hsl(0 0% 89.8%);will-change:transform}
            main{padding-top:4rem;min-height:100vh;flex:1}
            .hero-section{padding:3rem 1rem;text-align:center;background:linear-gradient(135deg,hsl(180 25% 95%) 0%,hsl(210 25% 95%) 50%,hsl(240 25% 95%) 100%);contain:layout paint}
            .container{max-width:1200px;margin:0 auto;padding:0 1rem}
            img{max-width:100%;height:auto;loading:lazy}
            @media (prefers-color-scheme:dark){
              body{color:hsl(0 0% 98%);background:hsl(0 0% 3.9%)}
              header{background:rgba(15,15,15,0.95);border-bottom:1px solid hsl(0 0% 14.9%)}
              .hero-section{background:linear-gradient(135deg,hsl(180 25% 5%) 0%,hsl(210 25% 5%) 50%,hsl(240 25% 5%) 100%)}
            }
            @media(max-width:768px){.hero-section{padding:2rem 1rem}}
          `
        }} />
        {/* Resource hints for performance */}
        <link rel="preconnect" href="https://tools-backend.z4bapj.easypanel.host" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body style={{ fontFamily: fontStack }}>
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