'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  maxPageButtons?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxPageButtons = 5
}: PaginationProps) {
  // If only one page, don't show pagination
  if (totalPages <= 1) {
    return null
  }
  
  // Generate an array of page numbers to display
  const getPageNumbers = () => {
    const pages = []
    
    // Always show first page
    pages.push(1)
    
    // Calculate range around current page
    const rangeStart = Math.max(
      2,
      currentPage - Math.floor((maxPageButtons - 2) / 2)
    )
    const rangeEnd = Math.min(
      totalPages - 1,
      rangeStart + maxPageButtons - 3
    )
    
    // Add ellipsis if there's a gap after page 1
    if (rangeStart > 2) {
      pages.push('ellipsis-start')
    }
    
    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }
    
    // Add ellipsis if there's a gap before last page
    if (rangeEnd < totalPages - 1) {
      pages.push('ellipsis-end')
    }
    
    // Always show last page (unless it's also the first page)
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages
  }
  
  const pageNumbers = getPageNumbers()
  
  return (
    <div className="flex items-center justify-center space-x-1 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
          return (
            <Button
              key={`ellipsis-${index}`}
              variant="ghost"
              size="icon"
              disabled
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )
        }
        
        return (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page as number)}
          >
            {page}
          </Button>
        )
      })}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
} 