// Service Worker Registration and Management
// Handles PWA functionality for ToolsCandy

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

const isLocalhost = typeof window !== 'undefined' ? Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
) : false

export function registerServiceWorker(config?: ServiceWorkerConfig) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href)
    
    // Check if public URL is on the same origin
    if (publicUrl.origin !== window.location.origin) {
      return
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/sw.js`

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config)

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
            'worker. To learn more, visit https://bit.ly/CRA-PWA'
          )
        })
      } else {
        // Is not localhost. Just register service worker
        registerValidServiceWorker(swUrl, config)
      }
    })
  }
}

function registerValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] Service worker registered successfully:', registration)
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing
        if (installingWorker == null) {
          return
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('[SW] New content is available and will be used when all tabs for this page are closed.')
              
              if (config && config.onUpdate) {
                config.onUpdate(registration)
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a "Content is cached for offline use." message.
              console.log('[SW] Content is cached for offline use.')
              
              if (config && config.onSuccess) {
                config.onSuccess(registration)
              }
            }
          }
        }
      }
    })
    .catch((error) => {
      console.error('[SW] Error during service worker registration:', error)
      if (config && config.onError) {
        config.onError(error)
      }
    })
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type')
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload()
          })
        })
      } else {
        // Service worker found. Proceed as normal.
        registerValidServiceWorker(swUrl, config)
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection found. App is running in offline mode.')
    })
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister()
        console.log('[SW] Service worker unregistered')
      })
      .catch((error) => {
        console.error('[SW] Error during service worker unregistration:', error)
      })
  }
}

// Check if app is running in standalone mode (installed as PWA)
export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true
}

// Get service worker registration
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.ready
    } catch (error) {
      console.error('[SW] Error getting service worker registration:', error)
      return null
    }
  }
  return null
}

// Send message to service worker
export function sendMessageToServiceWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller available'))
      return
    }

    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data)
    }

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2])
  })
}

// Force service worker to skip waiting and activate
export function skipWaiting(): void {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    return
  }
  
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
  }
}

// Get cached resources info
export async function getCacheInfo(): Promise<{ name: string; size: number }[]> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return []
  }
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name)
          const keys = await cache.keys()
          return { name, size: keys.length }
        })
      )
      return cacheInfo
    } catch (error) {
      console.error('[SW] Error getting cache info:', error)
      return []
    }
  }
  return []
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return
  }
  
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('[SW] All caches cleared')
    } catch (error) {
      console.error('[SW] Error clearing caches:', error)
    }
  }
}

// Check if app is online
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true // Assume online during SSR
  }
  return navigator.onLine
}

// Listen for online/offline events
export function addNetworkListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {} // Return empty cleanup function for SSR
  }

  const handleOnline = () => {
    console.log('[SW] App is online')
    onOnline?.()
  }

  const handleOffline = () => {
    console.log('[SW] App is offline')
    onOffline?.()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
} 