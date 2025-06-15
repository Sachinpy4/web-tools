import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import ContactContent from '@/components/pages/ContactContent'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/contact')
}

// Server component
export default function ContactPage() {
  return <ContactContent />
} 