'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Eye, Pencil, Trash, MoreHorizontal, BarChart2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/use-toast'
import { apiRequest } from '@/lib/apiClient'

interface Blog {
  id: string
  title: string
  excerpt: string
  date: string
  status: string
  author: string
  category: string
  featuredImage: string
  views: number
}

interface BlogGridProps {
  blogs: Blog[]
  onPostDeleted: () => void
}

export function BlogGrid({ blogs, onPostDeleted }: BlogGridProps) {
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  
  const confirmDelete = (id: string) => {
    setDeleteId(id)
  }
  
  const cancelDelete = () => {
    setDeleteId(null)
  }
  
  const handleDelete = async () => {
    if (!deleteId) return
    
    try {
      setIsDeleting(true)
      
      await apiRequest(`/blogs/${deleteId}`, {
        method: 'DELETE',
        requireAuth: true
      })
      
      toast({
        title: 'Blog post deleted',
        description: 'The blog post has been successfully deleted',
      })
      
      onPostDeleted()
    } catch (error) {
      console.error('Error deleting blog post:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete blog post. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }
  
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blogs.map((blog) => (
          <Card key={blog.id} className="overflow-hidden">
            <div className="aspect-video relative bg-muted">
              {blog.featuredImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={blog.featuredImage} 
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              
              <div className="absolute top-2 right-2">
                <Badge variant={blog.status === 'published' ? 'default' : 'outline'}>
                  {blog.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold truncate">{blog.title}</h3>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/blogs/edit/${blog.id}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/blog/${blog.id}`} target="_blank">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/blogs/${blog.id}/analytics`}>
                        <BarChart2 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/comments?blog=${blog.id}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comments
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => confirmDelete(blog.id)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{blog.excerpt}</p>
              
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div>{blog.date}</div>
                <div className="flex items-center">
                  <Eye className="h-3 w-3 mr-1" />
                  {blog.views}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post
              and remove the data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 