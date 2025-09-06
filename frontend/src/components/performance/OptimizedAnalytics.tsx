'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

interface OptimizedAnalyticsProps {
  gtmId?: string
  gtagId?: string
}

export function OptimizedAnalytics({ gtmId, gtagId }: OptimizedAnalyticsProps) {
  const [shouldLoadAnalytics, setShouldLoadAnalytics] = useState(false)

  useEffect(() => {
    // Ensure we're in browser environment only
    if (typeof window === 'undefined') return

    // Delay analytics loading until user interacts or after 3 seconds
    const timer = setTimeout(() => {
      setShouldLoadAnalytics(true)
    }, 3000)

    const handleUserInteraction = () => {
      setShouldLoadAnalytics(true)
      clearTimeout(timer)
    }

    // Load analytics on first user interaction
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true })
    })

    return () => {
      clearTimeout(timer)
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [])

  if (!shouldLoadAnalytics) {
    return null
  }

  return (
    <>
      {/* Minimal Google Analytics - Only essential tracking */}
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
            onLoad={() => {
              // Ensure we're in browser environment
              if (typeof window === 'undefined') return
              
              // Minimal gtag setup
              window.dataLayer = window.dataLayer || []
              function gtag(...args: any[]) {
                window.dataLayer?.push(args)
              }
              gtag('js', new Date())
              gtag('config', gtagId, {
                page_title: document.title,
                page_location: window.location.href,
                // Disable additional features to reduce payload
                send_page_view: true,
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
              })
            }}
          />
        </>
      )}

      {/* Minimal Google Tag Manager - Only if absolutely necessary */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}
    </>
  )
}
