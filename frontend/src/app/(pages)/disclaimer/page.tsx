import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import DisclaimerContent from '@/components/pages/DisclaimerContent'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/disclaimer')
}

// Server component
export default function DisclaimerPage() {
  return <DisclaimerContent />
} 