'use client'

import { useEffect } from 'react'

export function AsyncCSS() {
  useEffect(() => {
    // Load non-critical CSS asynchronously after page load
    const loadAsyncCSS = () => {
      // Check if CSS is already loaded
      const existingLink = document.querySelector('link[data-async-css]')
      if (existingLink) return

      // Preload additional stylesheets that aren't critical for first paint
      const nonCriticalStyles: string[] = [
        // Add paths to non-critical CSS files here when available
        // For now, we'll focus on optimizing existing CSS with critters
      ]

      nonCriticalStyles.forEach((href, index) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.setAttribute('data-async-css', `true-${index}`)
        link.media = 'print' // Load but don't apply initially
        link.onload = () => {
          link.media = 'all' // Apply styles after loading
        }
        
        document.head.appendChild(link)
      })
    }

    // Load after a short delay to prioritize critical rendering
    const timer = setTimeout(loadAsyncCSS, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return null // This component doesn't render anything
}
