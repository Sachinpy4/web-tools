/**
 * Image Proxy Utilities
 * 
 * Converts backend image URLs to use the frontend image proxy,
 * hiding backend infrastructure from public meta tags.
 */

// Get the current frontend domain
function getFrontendDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // For server-side rendering, use the deployment URL or localhost
  // First check for explicit frontend URL
  if (process.env.NEXT_PUBLIC_FRONTEND_URL) {
    return process.env.NEXT_PUBLIC_FRONTEND_URL
  }
  
  // Check for Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // For production, use the known production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://toolscandy.com'
  }
  
  // Default to localhost for development
  return 'http://localhost:3000'
}

// Get the backend API URL for comparison
function getBackendApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
}

/**
 * Convert a backend image URL to use the frontend image proxy
 * 
 * @param imageUrl - The original backend image URL
 * @returns Proxied URL or original URL if not a backend image
 */
export function getProxiedImageUrl(imageUrl: string | undefined | null): string | undefined {
  if (!imageUrl) {
    return undefined
  }
  
  try {
    const backendApiUrl = getBackendApiUrl()
    const backendDomain = backendApiUrl.replace('/api', '')
    
    // Check if this is a backend image URL
    if (imageUrl.includes(backendDomain) && imageUrl.includes('/api/media/file/')) {
      // Extract the path after '/api/media/file/'
      const mediaFilePattern = /\/api\/media\/file\/(.+)$/
      const match = imageUrl.match(mediaFilePattern)
      
      if (match && match[1]) {
        const imagePath = match[1]
        const frontendDomain = getFrontendDomain()
        const proxiedUrl = `${frontendDomain}/api/images/${imagePath}`
        
        return proxiedUrl
      }
    }
    
    // If not a backend URL, return as-is
    return imageUrl
  } catch (error) {
    console.error('[Image Proxy] Error converting URL:', error)
    return imageUrl
  }
}

/**
 * Convert multiple image URLs to use the proxy
 * 
 * @param imageUrls - Array of image URLs
 * @returns Array of proxied URLs
 */
export function getProxiedImageUrls(imageUrls: (string | undefined | null)[]): (string | undefined)[] {
  return imageUrls.map(url => getProxiedImageUrl(url))
}

/**
 * Check if a URL is a backend image URL that should be proxied
 * 
 * @param imageUrl - The image URL to check
 * @returns True if URL should be proxied
 */
export function shouldProxyImage(imageUrl: string | undefined | null): boolean {
  if (!imageUrl) {
    return false
  }
  
  try {
    const backendApiUrl = getBackendApiUrl()
    const backendDomain = backendApiUrl.replace('/api', '')
    
    return imageUrl.includes(backendDomain) && imageUrl.includes('/api/media/file/')
  } catch {
    return false
  }
}

/**
 * Get the original backend URL from a proxied URL
 * (Useful for admin operations that need direct backend access)
 * 
 * @param proxiedUrl - The proxied image URL
 * @returns Original backend URL or proxied URL if not a proxy
 */
export function getOriginalImageUrl(proxiedUrl: string | undefined | null): string | undefined {
  if (!proxiedUrl) {
    return undefined
  }
  
  try {
    const frontendDomain = getFrontendDomain()
    
    // Check if this is a proxied URL
    if (proxiedUrl.startsWith(`${frontendDomain}/api/images/`)) {
      // Extract the path after '/api/images/'
      const imagePath = proxiedUrl.replace(`${frontendDomain}/api/images/`, '')
      const backendApiUrl = getBackendApiUrl()
      const backendDomain = backendApiUrl.replace('/api', '')
      const originalUrl = `${backendDomain}/api/media/file/${imagePath}`
      
      return originalUrl
    }
    
    // If not a proxied URL, return as-is
    return proxiedUrl
  } catch (error) {
    console.error('[Image Proxy] Error reverting URL:', error)
    return proxiedUrl
  }
} 