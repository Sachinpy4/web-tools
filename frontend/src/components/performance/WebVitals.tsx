'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

export function WebVitals() {
  useEffect(() => {
    // Only track in production
    if (process.env.NODE_ENV !== 'production') return

    function sendToAnalytics(metric: any) {
      // Log metrics to console in production for now (can be sent to your own analytics)
      if (process.env.NODE_ENV === 'production') {
        console.log('Web Vital:', {
          name: metric.name,
          value: metric.value,
          id: metric.id,
          delta: metric.delta,
        })
      }
      
      // Optional: Send to your own analytics endpoint
      // fetch('/api/analytics/vitals', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric),
      // }).catch(() => {})
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
