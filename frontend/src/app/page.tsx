import type { Metadata } from 'next'
import { MainLayout } from '@/components/layout/MainLayout'
import { getServerSideMetadata } from '@/lib/seoUtils'
import HomeContent from '@/components/pages/HomeContent'

// Generate metadata server-side for SEO
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/')
}

export default function Home() {
  return (
    <MainLayout>
      <HomeContent />
    </MainLayout>
  )
} 