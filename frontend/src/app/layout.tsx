import type { Metadata } from 'next'
// Using system fonts for better performance
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { AppProviders } from '@/components/providers/AppProviders'
import { HeadScripts, BodyScripts, FooterScripts } from '@/components/analytics/DynamicScripts'
import { WebVitals } from '@/components/performance/WebVitals'
import { AsyncCSS } from '@/components/performance/AsyncCSS'
import Script from 'next/script'
import { generateOrganizationSchema, generateWebSiteSchema, renderJsonLd } from '@/lib/structuredData'

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
  // Generate structured data for Organization and WebSite
  const organizationSchema = generateOrganizationSchema()
  const websiteSchema = generateWebSiteSchema()
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadScripts />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        
        {/* JSON-LD Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(organizationSchema)}
        />
        
        {/* JSON-LD Structured Data for WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={renderJsonLd(websiteSchema)}
        />
        
        {/* Critical resource preloads for performance */}
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://tools-backend.z4bapj.easypanel.host" />
        {/* Inline critical CSS for faster rendering */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.6;scroll-behavior:smooth;max-width:100vw;overflow-x:hidden}
            body{margin:0;padding:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;max-width:100vw}
            *,*::before,*::after{box-sizing:border-box}
            header{position:fixed;top:0;left:0;right:0;z-index:50;height:4rem;backdrop-filter:blur(8px);will-change:transform}
            main{padding-top:4rem;min-height:100vh;flex:1;display:flex;flex-direction:column}
            .hero-section{padding:3rem 1rem;text-align:center;contain:layout paint}
            .container{max-width:1200px;margin:0 auto}
            img{max-width:100%;height:auto;loading:lazy;display:block}
            button{cursor:pointer;font-family:inherit}
            a{color:inherit;text-decoration:none}
            .loading{opacity:0;animation:fadeIn 0.3s ease forwards}
            @keyframes fadeIn{to{opacity:1}}
            @media(max-width:768px){.hero-section{padding:2rem 1rem}}
            @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}
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
            <AsyncCSS />
          </ThemeProvider>
        </AuthProvider>
        <FooterScripts />
      </body>
    </html>
  )
} 