import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/metadata')
}

export default function MetadataLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 