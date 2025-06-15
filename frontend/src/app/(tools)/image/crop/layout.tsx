import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/crop')
}

export default function CropLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 