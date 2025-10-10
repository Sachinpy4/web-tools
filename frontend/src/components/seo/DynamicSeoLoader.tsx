'use client'

import { useEffect } from 'react'
import { fetchDynamicSeoData, updatePageSeo } from '@/lib/seoUtils'

interface DynamicSeoLoaderProps {
  pagePath: string
}

/**
 * DynamicSeoLoader - Client-side SEO updater
 * 
 * ⚠️ WARNING: This component is deprecated and will be removed
 * 
 * Reason: It causes hydration mismatches because it updates meta tags
 * after the server has already rendered them. This creates duplicate 
 * meta tags and can confuse search engines.
 * 
 * Better approach: Use server-side metadata generation via generateMetadata()
 * in each page.tsx file. The metadata API in Next.js 13+ handles this correctly.
 * 
 * For now, this component is disabled to prevent SEO issues.
 */
export function DynamicSeoLoader({ pagePath }: DynamicSeoLoaderProps) {
  // DISABLED: This was causing hydration issues and duplicate meta tags
  // Server-side metadata via generateMetadata() is now used instead
  
  // useEffect(() => {
  //   // Only run on client-side after hydration
  //   const loadDynamicSeo = async () => {
  //     try {
  //       const seoData = await fetchDynamicSeoData(pagePath)
  //       
  //       if (seoData) {
  //         updatePageSeo(seoData)
  //       }
  //     } catch (error) {
  //       // Silent error handling - SEO fallbacks will be used
  //     }
  //   }

  //   // Small delay to ensure DOM is ready
  //   const timer = setTimeout(loadDynamicSeo, 100)
  //   
  //   return () => clearTimeout(timer)
  // }, [pagePath])

  // This component renders nothing
  return null
} 