'use client'

import { useEffect } from 'react'

export function AsyncCSS() {
  useEffect(() => {
    // Load non-critical CSS asynchronously after page load
    const loadAsyncCSS = () => {
      // Check if CSS is already loaded
      const existingLink = document.querySelector('link[data-async-css]')
      if (existingLink) return

      // Create link element for async CSS loading
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/css/non-critical.css' // You can create this file for non-critical styles
      link.setAttribute('data-async-css', 'true')
      link.media = 'print' // Load but don't apply initially
      link.onload = () => {
        link.media = 'all' // Apply styles after loading
      }
      
      document.head.appendChild(link)
    }

    // Load after a short delay to prioritize critical rendering
    const timer = setTimeout(loadAsyncCSS, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return null // This component doesn't render anything
}
