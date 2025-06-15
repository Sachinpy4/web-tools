import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import AboutContent from '@/components/pages/AboutContent'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/about')
}

// Server component
export default function AboutPage() {
  return <AboutContent />
} 