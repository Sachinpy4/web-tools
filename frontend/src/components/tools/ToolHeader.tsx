import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface ToolHeaderProps {
  title: string
  description: string
  icon?: React.ReactNode
}

export function ToolHeader({ title, description, icon }: ToolHeaderProps) {
  return (
    <div className="flex flex-col space-y-4 pb-8">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mr-2 h-8 w-8 p-0"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to home</span>
          </Link>
        </Button>
        
        <div className="flex items-center">
          {icon && <div className="mr-2">{icon}</div>}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
} 