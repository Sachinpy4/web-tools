'use client'

import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { apiRequest } from '@/lib/apiClient'

interface DeleteBlogDialogProps {
  blogId: string | number
  blogTitle: string
  onSuccess?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function DeleteBlogDialog({
  blogId,
  blogTitle,
  onSuccess,
  variant = 'ghost',
  size,
  className,
}: DeleteBlogDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      await apiRequest(`/blogs/${blogId}`, {
        method: 'DELETE',
        requireAuth: true
      });
      
      toast({
        title: 'Blog post deleted',
        description: `"${blogTitle}" has been deleted successfully.`,
      })
      
      // Close dialog and call success callback
      setIsOpen(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete blog post',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Trash className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this blog post?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{blogTitle}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 