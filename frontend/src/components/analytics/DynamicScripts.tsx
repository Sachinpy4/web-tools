'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { apiRequest } from '@/lib/apiClient'

// Extend Window interface to include tracking scripts
declare global {
  interface Window {
    dataLayer?: any[]      // Google Tag Manager
    fbq?: any             // Facebook Pixel
    gtag?: any            // Google Analytics
    _gaq?: any            // Legacy Google Analytics
  }
}

interface ScriptData {
  _id: string
  content: string
  placement: 'head' | 'body' | 'footer'
  priority: number
  platform: string
}

interface DynamicScriptsProps {
  placement: 'head' | 'body' | 'footer'
}

// Script loading status tracking
const scriptLoadStatus = new Map<string, 'loading' | 'loaded' | 'error'>()

export default function DynamicScripts({ placement }: DynamicScriptsProps) {
  const [scripts, setScripts] = useState<ScriptData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  // Enhanced content processing function for any HTML content
  const processContent = (content: string): { type: 'script' | 'noscript' | 'html', processedContent: string } => {
    try {
      // Handle noscript content
      if (content.includes('<noscript>')) {
        const noscriptMatch = content.match(/<noscript[^>]*>([\s\S]*?)<\/noscript>/i)
        return {
          type: 'noscript',
          processedContent: noscriptMatch ? noscriptMatch[1] : content
        }
      }

      // Handle script tags (extract JavaScript)
      if (content.includes('<script')) {
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
        let extractedContent = ''
        let match
        
        while ((match = scriptRegex.exec(content)) !== null) {
          const scriptContent = match[1]
          if (scriptContent && scriptContent.trim()) {
            extractedContent += scriptContent.trim() + '\n'
          }
        }
        
        const cleanedScript = extractedContent
          .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
          .replace(/&lt;/g, '<')           // Decode HTML entities
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()

        return {
          type: 'script',
          processedContent: cleanedScript
        }
      }

      // Handle any other HTML content (meta, link, style, etc.)
      // Clean up and decode entities but preserve HTML structure
      const cleanedHTML = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()

      return {
        type: 'html',
        processedContent: cleanedHTML
      }

    } catch (error) {
      console.error('Error processing content:', error)
      return {
        type: 'html',
        processedContent: content.trim()
      }
    }
  }

  // Script load handlers
  const handleScriptLoad = useCallback((scriptId: string, platform: string) => {
    scriptLoadStatus.set(scriptId, 'loaded')
    
    // Platform-specific initialization checks
    if (platform === 'Facebook Pixel') {
      // Check if fbq function exists after Facebook Pixel loads
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).fbq) {
          // Facebook Pixel initialized successfully
        }
      }, 100)
    } else if (platform === 'Google Analytics') {
      // Check if gtag function exists after GA loads
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).gtag) {
          // Google Analytics initialized successfully
        }
      }, 100)
    }
  }, [])

  const handleScriptError = useCallback((scriptId: string, platform: string) => {
    scriptLoadStatus.set(scriptId, 'error')
    console.error('❌ Script failed to load:', scriptId, platform)
  }, [])

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        setError(null)
        
        // Security check - never load scripts on admin pages
        if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
          setScripts([])
          setLoading(false)
          return
        }

        const response = await apiRequest<{status: string; data: ScriptData[]}>(
          `/scripts/public?pathname=${encodeURIComponent(pathname)}&placement=${placement}`,
          {
            requireAuth: false,
            retry: 2, // Retry failed requests
            noRedirect: true // Don't redirect on errors
          }
        )

        if (response.status === 'success') {
          // Sort by priority to ensure correct loading order
          const sortedScripts = (response.data || []).sort((a, b) => a.priority - b.priority)
          setScripts(sortedScripts)
        }
      } catch (error) {
        console.error('Error fetching scripts:', error)
        setError(error instanceof Error ? error.message : 'Failed to load scripts')
        // Set empty array on error to prevent blocking page load
        setScripts([])
      } finally {
        setLoading(false)
      }
    }

    fetchScripts()
  }, [pathname, placement])

  // Don't render anything while loading
  if (loading) {
    return null
  }

  // Don't render anything if no scripts
  if (scripts.length === 0) {
    return null
  }

  // Log error but don't block rendering
  if (error) {
    console.warn(`Dynamic scripts error for ${placement}:`, error)
  }

  return (
    <>
      {scripts.map((script, index) => {
        const scriptId = `${script._id}-${index}`
        
        // Mark script as loading
        scriptLoadStatus.set(scriptId, 'loading')

        // Extract and clean script content
        const { type, processedContent } = processContent(script.content)
        
        // Validate that we have actual JavaScript content
        if (type === 'script' && (!processedContent || processedContent.trim().length === 0)) {
          return null
        }

        // Detect the platform for better logging
        const isGTMScript = script.content.match(/GTM-[A-Z0-9]+/) && script.platform === 'Google Tag Manager'
        const isFacebookPixel = script.content.includes('fbq') || script.platform === 'Facebook Pixel'
        const isGoogleAnalytics = script.content.includes('gtag') || script.platform === 'Google Analytics'
        
        // Render based on content type
        if (type === 'noscript') {
          return (
            <noscript 
              key={scriptId}
              dangerouslySetInnerHTML={{
                __html: processedContent
              }}
            />
          )
        }

        if (type === 'script') {
          // Use Next.js Script component for JavaScript
          return (
            <Script
              key={scriptId}
              id={`dynamic-script-${script._id}`}
              strategy="lazyOnload"
              dangerouslySetInnerHTML={{
                __html: processedContent
              }}
              onLoad={() => handleScriptLoad(scriptId, script.platform)}
              onError={() => handleScriptError(scriptId, script.platform)}
            />
          )
        }

        if (type === 'html') {
          // For head placement, render directly as HTML
          if (placement === 'head') {
            return (
              <div
                key={scriptId}
                dangerouslySetInnerHTML={{
                  __html: processedContent
                }}
                style={{ display: 'none' }} // Hide the wrapper div
              />
            )
          }

          // For body/footer placement, render as regular HTML
          return (
            <div
              key={scriptId}
              dangerouslySetInnerHTML={{
                __html: processedContent
              }}
            />
          )
        }

        return null
      })}
    </>
  )
}

// Export named components for each placement
export function HeadScripts() {
  return <DynamicScripts placement="head" />
}

export function BodyScripts() {
  return <DynamicScripts placement="body" />
}

export function FooterScripts() {
  return <DynamicScripts placement="footer" />
}