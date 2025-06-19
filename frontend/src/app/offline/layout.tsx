import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline - ToolsCandy',
  description: 'You are currently offline. Some features of ToolsCandy are still available.',
  robots: 'noindex, nofollow',
}

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 