import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/resize')
}

export default function ResizeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 