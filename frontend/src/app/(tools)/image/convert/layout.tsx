import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'

export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/image/convert')
}

export default function ConvertLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}