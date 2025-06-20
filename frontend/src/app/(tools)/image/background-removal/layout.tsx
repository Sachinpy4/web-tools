import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/background-removal')
}

export default function BackgroundRemovalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 