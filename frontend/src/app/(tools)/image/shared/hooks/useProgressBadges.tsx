import React from 'react'
import { Badge } from '@/components/ui/badge'

interface ProgressBadgeProps {
  index: number
  results: any[]
  processingFiles: Set<number>
  visualProgress: Record<number, number>
  fileJobMapping: Record<number, string>
  jobProgress: Record<string, number>
  completedText: string
}

export function useProgressBadges() {
  const renderProgressBadge = ({
    index,
    results,
    processingFiles,
    visualProgress,
    fileJobMapping,
    jobProgress,
    completedText
  }: ProgressBadgeProps): React.ReactElement => {
    // Show completed badge if result exists
    if (results[index]) {
      return (
        <Badge className="bg-green-600 text-xs" variant="secondary">
          {completedText}
        </Badge>
      )
    }
    
    // Show processing badges
    return (
      <>
        {/* Visual progress simulation badge */}
        {processingFiles.has(index) && visualProgress[index] !== undefined && (
          <Badge className="bg-orange-600 text-xs" variant="secondary">
            Processing {visualProgress[index]}%
          </Badge>
        )}
        {/* Background job processing badge */}
        {!processingFiles.has(index) && fileJobMapping[index] && (
          <Badge className="bg-yellow-600 text-xs" variant="secondary">
            Processing {jobProgress[fileJobMapping[index]] ? `${Math.round(jobProgress[fileJobMapping[index]])}%` : ''}
          </Badge>
        )}
      </>
    )
  }

  return {
    renderProgressBadge
  }
} 