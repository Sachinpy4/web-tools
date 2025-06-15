'use client'

import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  MoreHorizontal, 
  Pencil, 
  Trash, 
  Eye, 
  BarChart2,
  Clock,
  MessageSquare,
  Calendar,
  User,
  Heart
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'

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
  likes: number
}

interface BlogTableProps {
  blogs: Blog[]
  onPostDeleted: () => void
}

export function BlogTable({ blogs, onPostDeleted }: BlogTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
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

  // Mobile card view for smaller screens
  const MobileView = () => (
    <div className="block lg:hidden space-y-3">
      {blogs.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            No blog posts found
          </div>
        </Card>
      ) : (
        blogs.map((blog) => (
          <Card key={blog.id} className="p-4">
            <CardContent className="p-0">
              <div className="space-y-3">
                {/* Header with title and status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2 leading-relaxed">
                      {blog.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {blog.excerpt}
                    </p>
                  </div>
                  <Badge 
                    variant={blog.status === 'published' ? 'default' : 'outline'}
                    className="flex-shrink-0 text-xs"
                  >
                    {blog.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                
                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{blog.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{blog.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{blog.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{blog.likes}</span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/blogs/edit/${blog.id}`}>
                      <Button variant="outline" size="sm" className="h-8 px-3">
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/blog/${blog.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="h-8 px-3">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
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
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  // Desktop table view for larger screens
  const DesktopView = () => (
    <div className="hidden lg:block rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Title</TableHead>
            <TableHead className="w-[12%]">Date</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[12%]">Category</TableHead>
            <TableHead className="w-[8%]">Views</TableHead>
            <TableHead className="w-[8%]">Likes</TableHead>
            <TableHead className="w-[15%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No blog posts found
              </TableCell>
            </TableRow>
          ) : (
            blogs.map((blog) => (
              <TableRow key={blog.id} className="hover:bg-muted/30">
                <TableCell className="max-w-0">
                  <div className="space-y-1">
                    <div className="font-medium truncate pr-4">{blog.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 pr-4">
                      {blog.excerpt}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {blog.date}
                </TableCell>
                <TableCell>
                  <Badge variant={blog.status === 'published' ? 'default' : 'outline'} className="text-xs">
                    {blog.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {blog.category}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{blog.views}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-sm">{blog.likes}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
  
  return (
    <>
      {/* Render appropriate view based on screen size */}
      <MobileView />
      <DesktopView />
      
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This action cannot be undone. This will permanently delete the blog post
              and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 