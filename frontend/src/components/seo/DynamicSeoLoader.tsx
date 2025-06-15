'use client'

import { useEffect } from 'react'
import { fetchDynamicSeoData, updatePageSeo } from '@/lib/seoUtils'

interface DynamicSeoLoaderProps {
  pagePath: string
}

export function DynamicSeoLoader({ pagePath }: DynamicSeoLoaderProps) {
  useEffect(() => {
    // Only run on client-side after hydration
    const loadDynamicSeo = async () => {
      try {
        const seoData = await fetchDynamicSeoData(pagePath)
        
        if (seoData) {
          updatePageSeo(seoData)
        }
      } catch (error) {
        // Silent error handling - SEO fallbacks will be used
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(loadDynamicSeo, 100)
    
    return () => clearTimeout(timer)
  }, [pagePath])

  // This component renders nothing visible
  return null
} 