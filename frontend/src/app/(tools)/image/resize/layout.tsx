import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import { generateToolSchema, generateHowToSchema, renderJsonLd } from '@/lib/structuredData'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/resize')
}

export default function ResizeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Tool schema for image resizer
  const toolSchema = generateToolSchema({
    name: 'Free Image Resizer',
    description: 'Resize images instantly in your browser. Scale by percentage or custom dimensions. Fast, secure, and completely free with no quality loss.',
    url: 'https://toolscandy.com/image/resize',
    features: [
      'Resize by percentage or custom dimensions',
      'Maintain aspect ratio',
      'Batch resize multiple images',
      'No file upload required',
      'Preserve image quality',
      'Works offline - all processing in browser'
    ],
    category: 'MultimediaApplication'
  })

  // How-to schema for image resizing
  const howToSchema = generateHowToSchema({
    name: 'How to Resize an Image',
    description: 'Learn how to resize images to custom dimensions using our free online tool',
    totalTime: 'PT1M',
    steps: [
      {
        name: 'Upload Image',
        text: 'Click "Choose File" or drag and drop your image file into the resizer.'
      },
      {
        name: 'Choose Resize Method',
        text: 'Select either percentage scaling or enter custom width and height dimensions.'
      },
      {
        name: 'Lock Aspect Ratio',
        text: 'Toggle the aspect ratio lock to maintain proportions or resize freely.'
      },
      {
        name: 'Resize Image',
        text: 'Click the "Resize" button to process your image instantly in your browser.'
      },
      {
        name: 'Download Result',
        text: 'Download your resized image with optimized quality.'
      }
    ]
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(toolSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={renderJsonLd(howToSchema)}
      />
      {children}
    </>
  )
} 