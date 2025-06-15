import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import TermsContent from '@/components/pages/TermsContent'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/terms')
}

// Server component
export default function TermsPage() {
  return <TermsContent />
} 