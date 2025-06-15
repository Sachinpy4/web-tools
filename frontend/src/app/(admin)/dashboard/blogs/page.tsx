'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Pencil, 
  Plus, 
  Search, 
  Trash, 
  FileText, 
  Eye as EyeIcon, 
  MoreHorizontal,
  Calendar,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BlogTable } from '@/components/admin/BlogTable'
import { BlogGrid } from '@/components/admin/BlogGrid'
import Link from 'next/link'
import { toast } from '@/components/ui/use-toast'
import { apiRequest } from '@/lib/apiClient'
import { Pagination } from '@/components/ui/pagination'

// Define types for the blog data
interface BlogAuthor {
  _id: string;
  name?: string;
  email?: string;
}

interface BlogData {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  status: string;
  author: BlogAuthor | string;
  category: string;
  tags: string[];
  featuredImage?: string;
  views: number;
  likes: number;
  slug: string;
  readingTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormattedBlog {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  status: string;
  author: string;
  category: string;
  featuredImage: string;
  views: number;
  likes: number;
}

export default function BlogsPage() {
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [blogs, setBlogs] = useState<BlogData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBlogs, setTotalBlogs] = useState(0)
  const [limit] = useState(10) // Number of blogs per page
  
  // Fetch blogs from API
  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query params
      let endpoint = '/blogs'
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      if (statusFilter) {
        queryParams.append('status', statusFilter)
      }
      
      if (searchQuery) {
        queryParams.append('search', searchQuery)
      }
      
      interface BlogResponse {
        status: string;
        data: BlogData[];
        total: number;
        pages: number;
      }
      
      const data = await apiRequest<BlogResponse>(`${endpoint}?${queryParams.toString()}`, {
        requireAuth: true
      });
      
      setBlogs(data.data || [])
      setTotalBlogs(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (error) {
      console.error('Error fetching blogs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load blog posts. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchQuery, page, limit])
  
  useEffect(() => {
    fetchBlogs()
  }, [fetchBlogs])
  
  // Format blogs for display
  const formattedBlogs: FormattedBlog[] = blogs.map(blog => {
    // Handle the author field which might be a string ID or an object
    let authorName = 'Unknown Author'
    if (blog.author) {
      if (typeof blog.author === 'string') {
        authorName = 'Author ID: ' + blog.author.substring(0, 8)
      } else if (typeof blog.author === 'object' && blog.author.name) {
        authorName = blog.author.name
      }
    }
    
    return {
      id: blog._id,
      title: blog.title,
      excerpt: blog.excerpt,
      date: new Date(blog.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      status: blog.status,
      author: authorName,
      category: blog.category,
      featuredImage: blog.featuredImage || '/placeholder-image-1.jpg',
      views: blog.views || 0,
      likes: blog.likes || 0
    }
  })
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to first page on search
    fetchBlogs()
  }
  
  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status)
    setPage(1) // Reset to first page on filter change
  }
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }
  
  const handlePostDeleted = () => {
    fetchBlogs()
  }
  
  // Render empty state if no blogs
  if (!loading && blogs.length === 0 && !searchQuery && !statusFilter) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
            <p className="text-muted-foreground mt-1">
              Create, edit and manage your blog posts.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/blogs/new">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>
        
        <Card className="p-12 text-center">
          <div className="mx-auto max-w-md">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Blog Posts Found</h2>
            <p className="text-muted-foreground mb-6">
              You haven't created any blog posts yet. Get started by creating your first post.
            </p>
            <Button asChild>
              <Link href="/dashboard/blogs/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Post
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit and manage your blog posts.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/blogs/new">
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <form onSubmit={handleSearch} className="flex w-full max-w-lg space-x-2">
            <Input
              placeholder="Search by title, content or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" size="icon">
              <Search className="h-4 w-4" />
            </Button>
            {searchQuery && (
              <Button 
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchQuery('')
                  // Only trigger a new search if there was a previous search term
                  if (searchQuery) {
                    setTimeout(() => fetchBlogs(), 0)
                  }
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </div>
        
        <div className="flex justify-between md:justify-end space-x-2">
          <Tabs 
            defaultValue={statusFilter || 'all'} 
            className="w-full max-w-[400px]"
            onValueChange={(value) => handleStatusFilterChange(value === 'all' ? null : value)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* <div className="flex space-x-1 border rounded-md">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setView('list')}
              className="rounded-r-none"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setView('grid')}
              className="rounded-l-none"
            >
              <Grid2x2 className="h-4 w-4" />
            </Button>
          </div> */}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading blog posts...</p>
          </div>
        </div>
      ) : blogs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto max-w-md">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Matching Blog Posts</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? `No blog posts match your search for "${searchQuery}"` 
                : statusFilter 
                  ? `You don't have any ${statusFilter} blog posts yet.` 
                  : "No blog posts found."}
            </p>
            {!searchQuery ? (
              <Button asChild>
                <Link href="/dashboard/blogs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Post
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setSearchQuery('')
                fetchBlogs()
              }}>
                Clear Search
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {view === 'list' ? (
            <BlogTable blogs={formattedBlogs} onPostDeleted={handlePostDeleted} />
          ) : (
            <BlogGrid blogs={formattedBlogs} onPostDeleted={handlePostDeleted} />
          )}
          
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                Showing {blogs.length} of {totalBlogs} blog posts
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 