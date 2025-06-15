import React from 'react'
import { Button } from '@/components/ui/button'
import { ToolTheme } from '../hooks/useProgressDisplay'
import { cn } from '@/lib/utils'

interface ThemedButtonProps extends React.ComponentProps<typeof Button> {
  toolTheme: ToolTheme
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
}

interface ThemedSpinnerProps {
  toolTheme: ToolTheme
  size?: 'sm' | 'md' | 'lg'
}

export function ThemedSpinner({ toolTheme, size = 'md' }: ThemedSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <svg 
      className={cn("animate-spin -ml-1 mr-3", sizeClasses[size])} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        style={{ fill: toolTheme.primaryColor }}
      />
    </svg>
  )
}

export function ThemedButton({ 
  toolTheme, 
  isLoading = false, 
  loadingText = "Processing...", 
  children, 
  className,
  variant = "default",
  ...props 
}: ThemedButtonProps) {
  const getButtonStyles = () => {
    if (variant === "outline") {
      return cn(
        "border-2 transition-all duration-300 hover:scale-105",
        `border-${toolTheme.accent} text-${toolTheme.accent}`,
        `hover:bg-${toolTheme.accentLight} hover:border-${toolTheme.accent}`,
        `dark:hover:bg-${toolTheme.accent}/20`,
        className
      )
    }
    
    // Default variant with gradient
    return cn(
      `bg-gradient-to-r ${toolTheme.buttonGradient}`,
      `hover:bg-gradient-to-r hover:${toolTheme.buttonHover}`,
      "text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl",
      `hover:shadow-${toolTheme.accent}/25`,
      "border-0",
      className
    )
  }

  return (
    <Button
      className={getButtonStyles()}
      variant={variant}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center">
          <ThemedSpinner toolTheme={toolTheme} />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </Button>
  )
} 