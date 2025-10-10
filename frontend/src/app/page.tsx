import type { Metadata } from 'next'
import { MainLayout } from '@/components/layout/MainLayout'
import { getServerSideMetadata } from '@/lib/seoUtils'
import { renderJsonLd } from '@/lib/structuredData'
import HomeContent from '@/components/pages/HomeContent'

// Generate metadata server-side for SEO
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/')
}

export default function Home() {
  // ItemList schema for featured tools
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Free Online Image Tools",
    "description": "Complete suite of browser-based image processing tools",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "SoftwareApplication",
          "name": "Image Compressor",
          "url": "https://toolscandy.com/image/compress",
          "description": "Compress images without losing quality",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@type": "SoftwareApplication",
          "name": "Image Format Converter",
          "url": "https://toolscandy.com/image/convert",
          "description": "Convert between image formats instantly",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      },
      {
        "@type": "ListItem",
        "position": 3,
        "item": {
          "@type": "SoftwareApplication",
          "name": "Image Resizer",
          "url": "https://toolscandy.com/image/resize",
          "description": "Resize images to custom dimensions",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      },
      {
        "@type": "ListItem",
        "position": 4,
        "item": {
          "@type": "SoftwareApplication",
          "name": "Image Cropper",
          "url": "https://toolscandy.com/image/crop",
          "description": "Crop images with precision",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      },
      {
        "@type": "ListItem",
        "position": 5,
        "item": {
          "@type": "SoftwareApplication",
          "name": "Background Remover",
          "url": "https://toolscandy.com/image/background-removal",
          "description": "Remove image backgrounds automatically",
          "applicationCategory": "MultimediaApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      }
    ]
  }

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(itemListSchema)}
      />
      <HomeContent />
    </MainLayout>
  )
} 