import { Metadata } from 'next'
import { Suspense } from 'react'
import { getServerSideMetadata } from '@/lib/seoUtils'
import BlogContent from '@/components/pages/BlogContent'
import { Skeleton } from '@/components/ui/skeleton'

// Server-side metadata generation
export async function generateMetadata(): Promise<Metadata> {
  return getServerSideMetadata('/blog')
}

// Loading component for blog content
function BlogLoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Server component with Suspense boundary
export default function BlogPage() {
  return (
    <Suspense fallback={<BlogLoadingFallback />}>
      <BlogContent />
    </Suspense>
  )
} 