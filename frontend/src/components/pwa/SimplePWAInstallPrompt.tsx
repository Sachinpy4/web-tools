'use client'

import { useState, useEffect } from 'react'
import { useSimplePWA } from './SimplePWAProvider'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function SimplePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const { isInstalled } = useSimplePWA()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Check if user has previously dismissed the prompt
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    setDismissed(isDismissed)

    let timeoutId: NodeJS.Timeout | null = null

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a delay if not dismissed
      if (!isDismissed && !isInstalled) {
        timeoutId = setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    const handleAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      // Silently handle installation errors
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !deferredPrompt || !showPrompt) {
    return null
  }

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-sm"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-purple-500 to-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/favicon.svg" 
                alt="ToolsCandy" 
                className="w-6 h-6"
              />
            </div>
            <h3 id="pwa-install-title" className="font-semibold text-gray-900 dark:text-white text-sm">
              Install ToolsCandy
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <p id="pwa-install-description" className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Install ToolsCandy for faster access and offline functionality. Works like a native app!
        </p>

        {/* Install Button */}
        <button
          onClick={handleInstallClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          🍭 Install App
        </button>
      </div>
    </div>
  )
} 