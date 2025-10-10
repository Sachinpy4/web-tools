import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import { generateToolSchema, generateHowToSchema, renderJsonLd } from '@/lib/structuredData'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/crop')
}

export default function CropLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Tool schema for image cropper
  const toolSchema = generateToolSchema({
    name: 'Free Image Cropper',
    description: 'Crop images with precision in your browser. Custom aspect ratios, freeform cropping, and predefined dimensions. Fast, secure, and completely free.',
    url: 'https://toolscandy.com/image/crop',
    features: [
      'Freeform and aspect ratio cropping',
      'Predefined aspect ratios (1:1, 4:3, 16:9)',
      'Custom crop dimensions',
      'Interactive drag-and-resize interface',
      'No file upload required',
      'Works offline - all processing in browser'
    ],
    category: 'MultimediaApplication'
  })

  // How-to schema for image cropping
  const howToSchema = generateHowToSchema({
    name: 'How to Crop an Image',
    description: 'Learn how to crop images to your desired area using our free online tool',
    totalTime: 'PT1M',
    steps: [
      {
        name: 'Upload Image',
        text: 'Click "Choose File" or drag and drop your image file into the cropper.'
      },
      {
        name: 'Select Aspect Ratio',
        text: 'Choose a preset aspect ratio (1:1, 4:3, 16:9) or select freeform for custom cropping.'
      },
      {
        name: 'Adjust Crop Area',
        text: 'Drag the corners and edges to adjust the crop area. Move the entire selection to reposition.'
      },
      {
        name: 'Crop Image',
        text: 'Click the "Crop" button to process your image instantly in your browser.'
      },
      {
        name: 'Download Result',
        text: 'Download your perfectly cropped image.'
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