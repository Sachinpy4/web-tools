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

  interface ProcessedScript {
    type: 'external-script' | 'inline-script' | 'noscript' | 'html'
    src?: string
    attrs?: Record<string, string>
    processedContent: string
  }

  const processContent = (content: string): ProcessedScript[] => {
    const results: ProcessedScript[] = []
    try {
      const decoded = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

      // Extract noscript blocks
      const noscriptRegex = /<noscript[^>]*>([\s\S]*?)<\/noscript>/gi
      let noscriptMatch
      while ((noscriptMatch = noscriptRegex.exec(decoded)) !== null) {
        results.push({ type: 'noscript', processedContent: noscriptMatch[1] })
      }

      // Extract script tags -- handle both external src and inline
      const scriptTagRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi
      let scriptMatch
      while ((scriptMatch = scriptTagRegex.exec(decoded)) !== null) {
        const attrsStr = scriptMatch[1]
        const body = scriptMatch[2].trim()
        const srcMatch = attrsStr.match(/src\s*=\s*["']([^"']+)["']/i)

        if (srcMatch) {
          const attrs: Record<string, string> = {}
          if (/async/i.test(attrsStr)) attrs.async = 'true'
          if (/defer/i.test(attrsStr)) attrs.defer = 'true'
          const crossOriginMatch = attrsStr.match(/crossorigin\s*=?\s*["']?([^"'\s>]*)["']?/i)
          if (crossOriginMatch) attrs.crossOrigin = crossOriginMatch[1] || 'anonymous'
          results.push({ type: 'external-script', src: srcMatch[1], attrs, processedContent: body })
        } else if (body) {
          const cleaned = body.replace(/<!--[\s\S]*?-->/g, '').trim()
          if (cleaned) {
            results.push({ type: 'inline-script', processedContent: cleaned })
          }
        }
      }

      // If no script or noscript tags found, treat as raw HTML
      if (results.length === 0) {
        const stripped = decoded.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '').replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim()
        if (stripped) {
          results.push({ type: 'html', processedContent: stripped })
        }
      } else {
        // Also capture any non-script HTML alongside scripts (e.g., noscript fallbacks next to script tags)
        const stripped = decoded
          .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .trim()
        if (stripped) {
          results.push({ type: 'html', processedContent: stripped })
        }
      }
    } catch (err) {
      console.error('Error processing content:', err)
      results.push({ type: 'html', processedContent: content.trim() })
    }
    return results
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
      {scripts.flatMap((script, sIndex) => {
        const items = processContent(script.content)

        return items.map((item, iIndex) => {
          const key = `${script._id}-${sIndex}-${iIndex}`
          scriptLoadStatus.set(key, 'loading')

          if (item.type === 'noscript') {
            return (
              <noscript
                key={key}
                dangerouslySetInnerHTML={{ __html: item.processedContent }}
              />
            )
          }

          if (item.type === 'external-script') {
            return (
              <Script
                key={key}
                id={`dynamic-script-${script._id}-ext-${iIndex}`}
                src={item.src}
                strategy="afterInteractive"
                crossOrigin={item.attrs?.crossOrigin as '' | 'anonymous' | 'use-credentials' | undefined}
                onLoad={() => handleScriptLoad(key, script.platform)}
                onError={() => handleScriptError(key, script.platform)}
              />
            )
          }

          if (item.type === 'inline-script') {
            return (
              <Script
                key={key}
                id={`dynamic-script-${script._id}-inline-${iIndex}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ __html: item.processedContent }}
                onLoad={() => handleScriptLoad(key, script.platform)}
                onError={() => handleScriptError(key, script.platform)}
              />
            )
          }

          if (item.type === 'html') {
            return (
              <div
                key={key}
                dangerouslySetInnerHTML={{ __html: item.processedContent }}
                style={placement === 'head' ? { display: 'none' } : undefined}
              />
            )
          }

          return null
        })
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