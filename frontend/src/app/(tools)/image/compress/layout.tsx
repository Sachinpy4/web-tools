import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/compress')
}

export default function CompressLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 