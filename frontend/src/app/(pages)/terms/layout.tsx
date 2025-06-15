import type { Metadata } from 'next'
import { fetchSeoData, generateMetadataFromSeo } from '@/lib/seoUtils'

// Generate metadata server-side for SEO
export async function generateMetadata(): Promise<Metadata> {
  const seoData = await fetchSeoData('/terms')
  return generateMetadataFromSeo(seoData)
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 