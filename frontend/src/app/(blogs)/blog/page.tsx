import { Metadata } from 'next'
import { getServerSideMetadata } from '@/lib/seoUtils'
import BlogContent from '@/components/pages/BlogContent'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/blog')
}

// Server component
export default function BlogPage() {
  return <BlogContent />
} 