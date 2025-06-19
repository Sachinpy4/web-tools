'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface PWAContextType {
  isInstalled: boolean
  isOnline: boolean
  updateAvailable: boolean
  refreshApp: () => void
  installPromptEvent: any
  canInstall: boolean
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

interface PWAProviderProps {
  children: ReactNode
}

export function SimplePWAProvider({ children }: PWAProviderProps) {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnlineState, setIsOnlineState] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Check if app is installed (running in standalone mode)
    const checkInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true
    }
    setIsInstalled(checkInstalled())
    
    // Check initial online status
    setIsOnlineState(navigator.onLine)

    // Check if PWA can be installed
    const checkCanInstall = () => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const isHTTPS = window.location.protocol === 'https:'
      return isHTTPS || isLocalhost
    }
    setCanInstall(checkCanInstall())

    // Register service worker with update handling
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      })
        .then((registration) => {
          // Check for updates every 30 seconds
          const updateCheckInterval = setInterval(() => {
            registration.update().catch(() => {
              // Silently handle update check failures
            })
          }, 30000)
          
          registration.onupdatefound = () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    setUpdateAvailable(true)
                    clearInterval(updateCheckInterval)
                  }
                }
              }
            }
          }
          
          // Store interval ID for cleanup
          ;(window as any)._pwaUpdateInterval = updateCheckInterval
        })
        .catch(() => {
          // Silently handle service worker registration failures
        })
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnlineState(true)
    const handleOffline = () => setIsOnlineState(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for app installation events
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPromptEvent(null)
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPromptEvent(e)
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Track user engagement to help trigger install prompt
    let userEngaged = false
    const trackEngagement = () => {
      if (!userEngaged) {
        userEngaged = true
      }
    }

    window.addEventListener('click', trackEngagement)
    window.addEventListener('scroll', trackEngagement)
    window.addEventListener('keydown', trackEngagement)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('click', trackEngagement)
      window.removeEventListener('scroll', trackEngagement)
      window.removeEventListener('keydown', trackEngagement)
      
      // Clean up update check interval
      if ((window as any)._pwaUpdateInterval) {
        clearInterval((window as any)._pwaUpdateInterval)
        delete (window as any)._pwaUpdateInterval
      }
    }
  }, [])

  const refreshApp = () => {
    if (updateAvailable && typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  const value: PWAContextType = {
    isInstalled,
    isOnline: isOnlineState,
    updateAvailable,
    refreshApp,
    installPromptEvent,
    canInstall
  }

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  )
}

export function useSimplePWA() {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('useSimplePWA must be used within a SimplePWAProvider')
  }
  return context
} 