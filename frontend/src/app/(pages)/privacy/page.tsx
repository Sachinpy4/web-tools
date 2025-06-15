import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import PrivacyContent from '@/components/pages/PrivacyContent'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/privacy')
}

// Server component
export default function PrivacyPage() {
  return <PrivacyContent />
} 