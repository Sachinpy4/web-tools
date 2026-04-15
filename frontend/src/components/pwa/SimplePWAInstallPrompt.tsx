'use client'

import { useState, useEffect } from 'react'
import { useSimplePWA } from './SimplePWAProvider'

export default function SimplePWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const { isInstalled, installPromptEvent } = useSimplePWA()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    setDismissed(isDismissed)
  }, [])

  useEffect(() => {
    if (!installPromptEvent || dismissed || isInstalled) return

    const timeoutId = setTimeout(() => setShowPrompt(true), 3000)
    return () => clearTimeout(timeoutId)
  }, [installPromptEvent, dismissed, isInstalled])

  const handleInstallClick = async () => {
    if (!installPromptEvent) return

    try {
      await installPromptEvent.prompt()
      await installPromptEvent.userChoice
      setShowPrompt(false)
    } catch (_error) {
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isInstalled || dismissed || !installPromptEvent || !showPrompt) {
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
            <div className="w-8 h-8 bg-linear-to-br from-teal-400 via-purple-500 to-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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