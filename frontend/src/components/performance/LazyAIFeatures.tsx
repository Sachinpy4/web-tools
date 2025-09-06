'use client'

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy AI/ML components
const BackgroundRemoval = lazy(() => 
  import('@/components/features/BackgroundRemoval').catch(() => 
    import('@/components/ui/fallback').then(module => ({ default: module.AIFeatureFallback }))
  )
)

const ImageEditor = lazy(() => 
  import('@/components/features/ImageEditor').catch(() => 
    import('@/components/ui/fallback').then(module => ({ default: module.AIFeatureFallback }))
  )
)

const TiptapEditor = lazy(() => 
  import('@/components/features/TiptapEditor').catch(() => 
    import('@/components/ui/fallback').then(module => ({ default: module.EditorFallback }))
  )
)

interface LazyAIFeaturesProps {
  feature: 'background-removal' | 'image-editor' | 'text-editor'
  children?: React.ReactNode
  fallback?: React.ReactNode
}

const defaultFallbacks = {
  'background-removal': (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Skeleton className="h-48 w-full max-w-md" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="text-sm text-muted-foreground">Loading AI background removal...</div>
    </div>
  ),
  'image-editor': (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Skeleton className="h-64 w-full max-w-lg" />
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="text-sm text-muted-foreground">Loading image editor...</div>
    </div>
  ),
  'text-editor': (
    <div className="flex flex-col space-y-4 p-4">
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="text-sm text-muted-foreground">Loading rich text editor...</div>
    </div>
  ),
}

export function LazyAIFeatures({ feature, children, fallback }: LazyAIFeaturesProps) {
  const defaultFallback = fallback || defaultFallbacks[feature]

  const renderComponent = () => {
    switch (feature) {
      case 'background-removal':
        return <BackgroundRemoval />
      case 'image-editor':
        return <ImageEditor />
      case 'text-editor':
        return <TiptapEditor />
      default:
        return <div>Feature not found</div>
    }
  }

  return (
    <Suspense fallback={defaultFallback}>
      {renderComponent()}
      {children}
    </Suspense>
  )
}

// Preload specific features when needed
export const preloadAIFeature = {
  backgroundRemoval: () => import('@/components/features/BackgroundRemoval'),
  imageEditor: () => import('@/components/features/ImageEditor'),
  textEditor: () => import('@/components/features/TiptapEditor'),
}

// Higher-order component for conditional loading
export function withLazyAI<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  feature: LazyAIFeaturesProps['feature']
) {
  return function LazyWrapper(props: T) {
    return (
      <LazyAIFeatures feature={feature}>
        <WrappedComponent {...props} />
      </LazyAIFeatures>
    )
  }
}
