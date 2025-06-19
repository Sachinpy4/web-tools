import { NextRequest, NextResponse } from 'next/server'

// Get backend API URL
function getBackendUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params since they're now wrapped in a Promise in Next.js 15
    const resolvedParams = await params
    const apiPath = resolvedParams.path.join('/')
    
    // Only handle archive endpoint
    if (apiPath !== 'archive') {
      return new NextResponse('Not Found', { status: 404 })
    }
    
    // Get the request body
    const body = await request.json()
    
    // Forward to backend
    const backendUrl = getBackendUrl()
    const backendApiUrl = `${backendUrl}/images/archive`
    
    console.log(`[Archive API] Forwarding POST to: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NextJS-API-Proxy/1.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000), // 30 second timeout for archive creation
    })
    
    if (!response.ok) {
      console.error(`[Archive API] Backend returned ${response.status}`)
      const errorText = await response.text()
      return new NextResponse(errorText || 'Archive creation failed', { status: response.status })
    }
    
    const result = await response.json()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error(`[Archive API] Error:`, error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new NextResponse('Archive creation timeout', { status: 504 })
    }
    
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params since they're now wrapped in a Promise in Next.js 15
    const resolvedParams = await params
    
    // Construct the backend image URL
    const imagePath = resolvedParams.path.join('/')
    const backendUrl = getBackendUrl().replace('/api', '')
    const imageUrl = `${backendUrl}/api/media/file/${imagePath}`
    
    console.log(`[Image Proxy] Requesting: ${imageUrl}`)
    
    // Fetch the image from backend
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'NextJS-Image-Proxy/1.0',
      },
      // Add timeout for safety (10 seconds)
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      console.error(`[Image Proxy] Backend returned ${response.status} for ${imageUrl}`)
      return new NextResponse('Image not found', { status: 404 })
    }
    
    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    
    // Get content type from backend response
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    
    // Return the proxied image
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'X-Proxied-From': 'Backend-API', // Debug header
      },
    })
  } catch (error) {
    console.error(`[Image Proxy] Error:`, error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new NextResponse('Request timeout', { status: 504 })
    }
    
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Also handle HEAD requests for efficiency
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params since they're now wrapped in a Promise in Next.js 15
    const resolvedParams = await params
    
    const imagePath = resolvedParams.path.join('/')
    const backendUrl = getBackendUrl().replace('/api', '')
    const imageUrl = `${backendUrl}/api/media/file/${imagePath}`
    
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout for HEAD
    })
    
    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const contentLength = response.headers.get('content-length')
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(contentLength && { 'Content-Length': contentLength }),
      },
    })
    
  } catch (error) {
    console.error('[Image Proxy] HEAD Error:', error)
    return new NextResponse(null, { status: 500 })
  }
} 