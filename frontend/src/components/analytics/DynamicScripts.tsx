'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { apiRequest } from '@/lib/apiClient'

declare global {
  interface Window {
    dataLayer?: any[]
    fbq?: any
    gtag?: any
    _gaq?: any
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

interface ProcessedScript {
  type: 'external-script' | 'inline-script' | 'noscript' | 'html'
  src?: string
  attrs?: Record<string, string>
  processedContent: string
}

const injectedScripts = new Set<string>()

export default function DynamicScripts({ placement }: DynamicScriptsProps) {
  const [scripts, setScripts] = useState<ScriptData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const noscriptRef = useRef<(ProcessedScript & { key: string })[]>([])
  const htmlRef = useRef<(ProcessedScript & { key: string })[]>([])

  const processContent = (content: string): ProcessedScript[] => {
    const results: ProcessedScript[] = []
    try {
      const decoded = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

      const noscriptRegex = /<noscript[^>]*>([\s\S]*?)<\/noscript>/gi
      let noscriptMatch
      while ((noscriptMatch = noscriptRegex.exec(decoded)) !== null) {
        results.push({ type: 'noscript', processedContent: noscriptMatch[1] })
      }

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

      const stripped = decoded
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .trim()
      if (stripped) {
        results.push({ type: 'html', processedContent: stripped })
      }
    } catch (err) {
      console.error('Error processing content:', err)
      results.push({ type: 'html', processedContent: content.trim() })
    }
    return results
  }

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        setError(null)

        if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
          setScripts([])
          setLoading(false)
          return
        }

        const response = await apiRequest<{status: string; data: ScriptData[]}>(
          `/scripts/public?pathname=${encodeURIComponent(pathname)}&placement=${placement}`,
          { requireAuth: false, retry: 2, noRedirect: true }
        )

        if (response.status === 'success') {
          const sortedScripts = (response.data || []).sort((a, b) => a.priority - b.priority)
          setScripts(sortedScripts)
        }
      } catch (err) {
        console.error('Error fetching scripts:', err)
        setError(err instanceof Error ? err.message : 'Failed to load scripts')
        setScripts([])
      } finally {
        setLoading(false)
      }
    }

    fetchScripts()
  }, [pathname, placement])

  // Inject scripts via native DOM API to avoid Next.js adding data-nscript
  const injectScript = useCallback((item: ProcessedScript, scriptId: string) => {
    if (injectedScripts.has(scriptId)) return
    injectedScripts.add(scriptId)

    const el = document.createElement('script')

    if (item.type === 'external-script' && item.src) {
      el.src = item.src
      if (item.attrs?.async) el.async = true
      if (item.attrs?.defer) el.defer = true
      if (item.attrs?.crossOrigin) el.crossOrigin = item.attrs.crossOrigin
      el.onload = () => { /* loaded */ }
      el.onerror = () => console.error('Script failed to load:', item.src)
    } else if (item.type === 'inline-script') {
      el.textContent = item.processedContent
    }

    const target = placement === 'head' ? document.head : document.body
    target.appendChild(el)
  }, [placement])

  useEffect(() => {
    if (loading || scripts.length === 0) return

    const noscripts: (ProcessedScript & { key: string })[] = []
    const htmlItems: (ProcessedScript & { key: string })[] = []

    scripts.forEach((script, sIndex) => {
      const items = processContent(script.content)
      items.forEach((item, iIndex) => {
        const key = `${script._id}-${sIndex}-${iIndex}`

        if (item.type === 'external-script' || item.type === 'inline-script') {
          injectScript(item, key)
        } else if (item.type === 'noscript') {
          noscripts.push({ ...item, key })
        } else if (item.type === 'html') {
          htmlItems.push({ ...item, key })
        }
      })
    })

    noscriptRef.current = noscripts
    htmlRef.current = htmlItems
  }, [scripts, loading, injectScript])

  if (loading || scripts.length === 0) return null

  if (error) {
    console.warn(`Dynamic scripts error for ${placement}:`, error)
  }

  const noscripts: (ProcessedScript & { key: string })[] = []
  const htmlItems: (ProcessedScript & { key: string })[] = []

  scripts.forEach((script, sIndex) => {
    const items = processContent(script.content)
    items.forEach((item, iIndex) => {
      const key = `${script._id}-${sIndex}-${iIndex}`
      if (item.type === 'noscript') noscripts.push({ ...item, key })
      else if (item.type === 'html') htmlItems.push({ ...item, key })
    })
  })

  return (
    <>
      {noscripts.map((item) => (
        <noscript key={item.key} dangerouslySetInnerHTML={{ __html: item.processedContent }} />
      ))}
      {htmlItems.map((item) => (
        <div
          key={item.key}
          dangerouslySetInnerHTML={{ __html: item.processedContent }}
          style={placement === 'head' ? { display: 'none' } : undefined}
        />
      ))}
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