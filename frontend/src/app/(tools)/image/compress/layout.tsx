import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import { generateToolSchema, generateHowToSchema, renderJsonLd } from '@/lib/structuredData'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/compress')
}

export default function CompressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Tool schema
  const toolSchema = generateToolSchema({
    name: 'Image Compression Tool',
    description: 'Compress JPG, PNG, SVG, and GIF images while maintaining quality. Free online tool with privacy-first processing.',
    url: 'https://toolscandy.com/image/compress',
    features: [
      'JPG compression',
      'PNG compression',
      'SVG optimization',
      'GIF compression',
      'Batch processing',
      'No upload required',
      'Privacy-focused',
      'Adjustable quality settings'
    ],
    category: 'MultimediaApplication',
  })

  // HowTo schema
  const howToSchema = generateHowToSchema({
    name: 'How to Compress Images Online',
    description: 'Compress your images in 3 easy steps using our free online tool',
    totalTime: 'PT2M',
    steps: [
      {
        name: 'Upload Image',
        text: 'Click or drag your image files to upload them. Supports JPG, PNG, SVG, and GIF formats.',
      },
      {
        name: 'Adjust Quality',
        text: 'Use the quality slider to set compression level (1-100). Lower values create smaller files.',
      },
      {
        name: 'Download',
        text: 'Click compress and download your optimized image. Use batch compress for multiple files.',
      },
    ],
  })

  return (
    <>
      {/* JSON-LD for SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(toolSchema)}
      />
      
      {/* JSON-LD for HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(howToSchema)}
      />
      
      {children}
    </>
  )
} 