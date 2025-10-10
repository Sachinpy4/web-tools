import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import { generateToolSchema, generateHowToSchema, renderJsonLd } from '@/lib/structuredData'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/convert')
}

export default function ConvertLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Tool schema for image converter
  const toolSchema = generateToolSchema({
    name: 'Free Image Format Converter',
    description: 'Convert images between formats instantly in your browser. Supports JPG, PNG, WebP, GIF, BMP, and more. Fast, secure, and completely free.',
    url: 'https://toolscandy.com/image/convert',
    features: [
      'Convert between 10+ image formats',
      'Batch conversion support',
      'Preserve image quality',
      'No file upload required',
      'Works offline',
      'Privacy-focused - all processing in browser'
    ],
    category: 'MultimediaApplication'
  })

  // How-to schema for image conversion
  const howToSchema = generateHowToSchema({
    name: 'How to Convert Image Format',
    description: 'Learn how to convert images between formats using our free online tool',
    totalTime: 'PT1M',
    steps: [
      {
        name: 'Select Image',
        text: 'Click "Choose File" or drag and drop your image file into the converter.'
      },
      {
        name: 'Choose Output Format',
        text: 'Select your desired output format from the dropdown menu (JPG, PNG, WebP, GIF, BMP, etc.).'
      },
      {
        name: 'Adjust Quality',
        text: 'Optionally adjust the quality slider to control file size and image quality.'
      },
      {
        name: 'Convert',
        text: 'Click the "Convert" button to process your image instantly in your browser.'
      },
      {
        name: 'Download',
        text: 'Once converted, download your image file with the new format.'
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