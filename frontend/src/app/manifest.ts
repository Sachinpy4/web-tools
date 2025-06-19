import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ToolsCandy - Professional Image Processing Tools',
    short_name: 'ToolsCandy',
    description: 'Professional image compression, conversion, resizing, and processing tools. Fast, secure, and privacy-focused.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    categories: ['productivity', 'utilities', 'photo'],
    lang: 'en',
    dir: 'ltr',
    scope: '/',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
        type: 'image/x-icon',
      },
      {
        src: '/favicon.svg',
        sizes: '48x48 72x72 96x96 128x128 256x256',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/logo.svg',
        sizes: '144x144 192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/logo.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Compress Images',
        short_name: 'Compress',
        description: 'Quickly compress images to reduce file size',
        url: '/image/compress',
        icons: [{ src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' }]
      },
      {
        name: 'Convert Images',
        short_name: 'Convert',
        description: 'Convert images between different formats',
        url: '/image/convert',
        icons: [{ src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' }]
      },
      {
        name: 'Resize Images',
        short_name: 'Resize',
        description: 'Resize and scale images to specific dimensions',
        url: '/image/resize',
        icons: [{ src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' }]
      }
    ],
    related_applications: [],
    prefer_related_applications: false
  }
} 