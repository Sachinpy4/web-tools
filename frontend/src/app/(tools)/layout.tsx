import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MainLayout>{children}</MainLayout>
} 