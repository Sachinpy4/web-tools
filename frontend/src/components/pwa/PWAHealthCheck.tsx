'use client'

import { useEffect, useState } from 'react'

interface PWAHealthStatus {
  manifestValid: boolean
  serviceWorkerActive: boolean
  httpsEnabled: boolean
  iconsValid: boolean
  installable: boolean
  errors: string[]
  warnings: string[]
}

export function PWAHealthCheck() {
  const [healthStatus, setHealthStatus] = useState<PWAHealthStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const runHealthCheck = async () => {
    if (typeof window === 'undefined') return

    setIsChecking(true)
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check HTTPS
      const httpsEnabled = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      if (!httpsEnabled) {
        errors.push('PWA requires HTTPS in production')
      }

      // Check Manifest
      let manifestValid = false
      try {
        const response = await fetch('/manifest.webmanifest')
        if (response.ok) {
          const manifest = await response.json()
          manifestValid = !!(manifest.name && manifest.short_name && manifest.start_url && manifest.display)
          if (!manifest.icons || manifest.icons.length === 0) {
            warnings.push('Manifest should include icons for better app store presentation')
          }
        } else {
          errors.push('Manifest file not accessible')
        }
      } catch (error) {
        errors.push('Failed to load manifest')
      }

      // Check Service Worker
      let serviceWorkerActive = false
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          if (registration) {
            // Check if service worker is active, installing, or waiting
            serviceWorkerActive = !!(registration.active || registration.installing || registration.waiting)
            if (!serviceWorkerActive) {
              warnings.push('Service worker not found')
            } else if (!registration.active && (registration.installing || registration.waiting)) {
              // Service worker is there but not yet active - this is normal during startup
              serviceWorkerActive = true // Consider it active for our purposes
            }
          } else {
            warnings.push('Service worker registration not found')
          }
        } catch (error) {
          errors.push('Service worker check failed')
        }
      } else {
        errors.push('Service Worker not supported in this browser')
      }

      // Check Icons
      let iconsValid = false
      try {
        const iconChecks = await Promise.all([
          fetch('/favicon.ico').then(r => r.ok),
          fetch('/favicon.svg').then(r => r.ok),
          fetch('/logo.svg').then(r => r.ok)
        ])
        iconsValid = iconChecks.every(check => check)
        if (!iconsValid) {
          warnings.push('Some icon files are missing or inaccessible')
        }
      } catch (error) {
        warnings.push('Could not verify icon files')
      }

      // Check Installability
      let installable = false
      if (manifestValid && serviceWorkerActive && httpsEnabled) {
        installable = true
      }

      setHealthStatus({
        manifestValid,
        serviceWorkerActive,
        httpsEnabled,
        iconsValid,
        installable,
        errors,
        warnings
      })
    } catch (error) {
      errors.push('Health check failed: ' + (error as Error).message)
      setHealthStatus({
        manifestValid: false,
        serviceWorkerActive: false,
        httpsEnabled: false,
        iconsValid: false,
        installable: false,
        errors,
        warnings
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Run health check after a short delay to allow service worker to activate
    const initialDelay = setTimeout(() => {
      runHealthCheck()
    }, 2000)
    
    // Then run every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000)
    
    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [])

  if (!healthStatus) {
    return null
  }

  const hasIssues = healthStatus.errors.length > 0 || healthStatus.warnings.length > 0

  // Only show in development or if there are actual errors (not warnings)
  if (process.env.NODE_ENV === 'production' && healthStatus.errors.length === 0) {
    return null
  }

  // In development, show if there are any issues
  if (process.env.NODE_ENV === 'development' && !hasIssues) {
    return null
  }

  return (
    <div className="fixed top-16 right-4 z-40 max-w-sm">
      <div className={`rounded-lg p-3 text-xs ${
        healthStatus.errors.length > 0 
          ? 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          : healthStatus.warnings.length > 0
          ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
          : 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
      }`}>
        <div className="font-semibold mb-2">
          PWA Health Check {isChecking && '(Checking...)'}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span>{healthStatus.httpsEnabled ? '✅' : '❌'}</span>
            <span>HTTPS/Localhost</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{healthStatus.manifestValid ? '✅' : '❌'}</span>
            <span>Valid Manifest</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{healthStatus.serviceWorkerActive ? '✅' : '⏳'}</span>
            <span>Service Worker</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{healthStatus.iconsValid ? '✅' : '⚠️'}</span>
            <span>Icons Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{healthStatus.installable ? '✅' : '❌'}</span>
            <span>PWA Installable</span>
          </div>
        </div>

        {healthStatus.errors.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <div className="font-semibold">Errors:</div>
            {healthStatus.errors.map((error, i) => (
              <div key={i} className="text-xs">• {error}</div>
            ))}
          </div>
        )}

        {healthStatus.warnings.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <div className="font-semibold">Warnings:</div>
            {healthStatus.warnings.map((warning, i) => (
              <div key={i} className="text-xs">• {warning}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 