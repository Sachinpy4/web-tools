'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

export function WebVitals() {
  useEffect(() => {
    // Only track in production
    if (process.env.NODE_ENV !== 'production') return

    const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals'

    function sendToAnalytics(metric: any) {
      const body = JSON.stringify(metric)
      
      // Use sendBeacon if available for better reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(vitalsUrl, body)
      } else {
        fetch(vitalsUrl, {
          body,
          method: 'POST',
          keepalive: true,
        }).catch(console.error)
      }
    }

    // Track all Core Web Vitals
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics)
    onFCP(sendToAnalytics)
    onLCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
  }, [])

  return null // This component doesn't render anything
}
