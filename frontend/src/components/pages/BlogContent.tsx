'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/ui/pagination'
import { 
  CalendarIcon, 
  Search, 
  UserIcon, 
  Clock, 
  Tag,
  ArrowRight,
  X
} from 'lucide-react'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { getProxiedImageUrl } from '@/lib/imageProxy'

// Define blog post interface
interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  status: string;
  author: { name: string; email: string } | string | null;
  category: string;
  tags: string[];
  featuredImage?: string;
  views: number;
  readingTime?: string;
  slug: string;
  // SEO metadata fields
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
}

interface BlogResponse {
  status: string;
  data: BlogPost[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export default function BlogContent() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  
  // Pagination state - SERVER-SIDE PAGINATION
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPosts, setTotalPosts] = useState(0)
  const [postsPerPage] = useState(12) // Reasonable page size
  const [showAllTags, setShowAllTags] = useState(false)
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setCurrentPage(1) // Reset to first page on search
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchInput, searchQuery])
  
  // Fetch blogs from API with server-side pagination
  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query params for server-side pagination
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: postsPerPage.toString()
      })
      
      if (activeCategory) {
        queryParams.append('category', activeCategory)
      }
      
      if (searchQuery.trim()) {
        queryParams.append('search', searchQuery.trim())
      }
      
      if (activeTag) {
        queryParams.append('tag', activeTag)
      }
      
      const endpoint = `/blogs/public?${queryParams.toString()}`
      
      try {
        // Use the public endpoint with proper pagination
        const response = await apiRequest<BlogResponse>(endpoint, { noRedirect: true })
        
        setBlogPosts(response.data || [])
        setTotalPages(response.pages || 1)
        setTotalPosts(response.total || 0)
        
        // Extract categories and tags from current page results
        if (response.data && response.data.length > 0) {
          const categories = Array.from(new Set(response.data.map(post => post.category)))
          const tags = Array.from(
            new Set(response.data.flatMap(post => post.tags))
          ).sort()
          
          // Merge with existing categories/tags to avoid losing them on page changes
          setAllCategories(prev => Array.from(new Set([...prev, ...categories])))
          setAllTags(prev => Array.from(new Set([...prev, ...tags])).sort())
        }
        
      } catch (error) {
        console.error('Error fetching public blogs:', error)
        
        // Fallback to mock data only if it's a server error
        const mockPosts: BlogPost[] = [
          {
            _id: '1',
            title: 'How to Optimize Your Web Images for Speed',
            excerpt: 'Learn the best practices for optimizing your web images to improve site performance and user experience.',
            content: 'Full content would go here...',
            date: new Date().toISOString(),
            status: 'published',
            author: { name: 'John Smith', email: 'john@example.com' },
            category: 'Optimization',
            tags: ['Performance', 'Images', 'Optimization', 'Web Development'],
            featuredImage: '/placeholder-image-1.jpg',
            views: 1452,
            readingTime: '5 min read',
            slug: 'how-to-optimize-web-images'
          },
          {
            _id: '2',
            title: '10 Essential Image Optimization Tips for Web Developers',
            excerpt: 'A comprehensive guide to optimizing images for the web, including format selection, compression techniques, and more.',
            content: 'Full content would go here...',
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), 
            status: 'published',
            author: { name: 'Jane Doe', email: 'jane@example.com' },
            category: 'Web Development',
            tags: ['Images', 'Web Development', 'Optimization', 'Best Practices'],
            featuredImage: '/placeholder-image-2.jpg',
            views: 892,
            readingTime: '8 min read',
            slug: 'essential-image-optimization-tips'
          },
        ]
        
        setBlogPosts(mockPosts)
        setTotalPages(1)
        setTotalPosts(mockPosts.length)
        
        const categories = Array.from(new Set(mockPosts.map(post => post.category)))
        setAllCategories(categories)
        
        const tags = Array.from(
          new Set(mockPosts.flatMap(post => post.tags))
        ).sort()
        setAllTags(tags)
        
        toast({
          title: 'Using demo content',
          description: 'The blog is currently displaying demo content while we resolve a server issue.',
          variant: 'default',
        })
      }
    } catch (error) {
      console.error('Error in blog page:', error)
      toast({
        title: 'Error',
        description: 'Failed to load blog posts. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentPage, postsPerPage, activeCategory, activeTag, searchQuery])

  // Load categories and tags separately for filters
  const fetchCategoriesAndTags = useCallback(async () => {
    try {
      // Fetch categories
      const categoriesResponse = await apiRequest<{ status: string; data: string[] }>('/blogs/categories', { noRedirect: true })
      if (categoriesResponse.data) {
        setAllCategories(categoriesResponse.data)
      }
      
      // Fetch tags
      const tagsResponse = await apiRequest<{ status: string; data: string[] }>('/blogs/tags', { noRedirect: true })
      if (tagsResponse.data) {
        setAllTags(tagsResponse.data)
      }
    } catch (error) {
      console.error('Error fetching categories/tags:', error)
    }
  }, [])
  
  // Load data on component mount or when filters change
  useEffect(() => {
    fetchBlogs()
  }, [fetchBlogs])

  // Load categories and tags on mount
  useEffect(() => {
    fetchCategoriesAndTags()
  }, [fetchCategoriesAndTags])
  
  // Handle search form submission (immediate search)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setCurrentPage(1)
  }
  
  // Format author name
  const getAuthorName = (author: { name: string; email: string } | string | null): string => {
    if (!author || typeof author === 'string') {
      return 'Anonymous'
    }
    return author.name || 'Anonymous'
  }
  
  // Handle category change
  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category)
    setCurrentPage(1) // Reset to first page
  }
  
  // Toggle tag filter
  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null)
    } else {
      setActiveTag(tag)
    }
    setCurrentPage(1) // Reset to first page
  }
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // Helper function to get proxied featured image URL
  const getProxiedFeaturedImage = (imageUrl: string): string => {
    if (!imageUrl) return imageUrl
    return getProxiedImageUrl(imageUrl) || imageUrl
  }
  
  if (loading) {
    return (
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Our Latest News
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Loading blog posts...
        </p>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={`skeleton-${index}`} className="rounded-lg border p-4 h-[350px] animate-pulse">
              <div className="h-40 bg-muted rounded-md mb-4"></div>
              <div className="h-4 w-1/4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded mb-4"></div>
              <div className="h-16 bg-muted rounded mb-4"></div>
              <div className="flex justify-between mt-4">
                <div className="h-4 w-1/3 bg-muted rounded"></div>
                <div className="h-4 w-1/4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Our Latest News
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tips, tutorials, and insights about web performance, image optimization, and modern web development.
        </p>
      </div>
      
      {/* Search and filter */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search articles..." 
              className="pl-10"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>
          
          <Tabs value={activeCategory || 'all'} className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto overflow-x-auto max-w-full flex-nowrap">
              <TabsTrigger value="all" onClick={() => handleCategoryChange(null)}>
                All Categories
              </TabsTrigger>
              {allCategories.slice(0, 3).map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </TabsTrigger>
              ))}
              {allCategories.length > 3 && (
                <TabsTrigger 
                  value="more" 
                  onClick={() => {
                    toast({
                      title: "More categories",
                      description: "This would show all categories in a dropdown menu.",
                      duration: 2000,
                    })
                  }}
                >
                  More
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Active filters display */}
        {(activeCategory || activeTag || searchQuery) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeCategory && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCategoryChange(null)}
              >
                Category: {activeCategory}
                <X className="ml-2 h-3 w-3" />
              </Button>
            )}
            {activeTag && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTagClick(activeTag)}
              >
                Tag: {activeTag}
                <X className="ml-2 h-3 w-3" />
              </Button>
            )}
            {searchQuery && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
              >
                Search: "{searchQuery}"
                <X className="ml-2 h-3 w-3" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveCategory(null)
                setActiveTag(null)
                setSearchInput('')
                setSearchQuery('')
                setCurrentPage(1)
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>
      
      {/* Results summary */}
      <div className="mb-6 text-sm text-muted-foreground">
        Showing {blogPosts.length} of {totalPosts} posts
        {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
      </div>
      
      {/* Featured post - only on first page */}
      {currentPage === 1 && blogPosts.length > 0 && (
        <div className="mb-16 bg-gradient-to-br from-teal-50/50 via-blue-50/50 to-indigo-50/50 dark:from-teal-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 shadow-sm border border-teal-100/50 dark:border-teal-800/50">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-[350px] rounded-xl overflow-hidden bg-muted">
              {blogPosts[0].featuredImage ? (
                <img 
                  src={getProxiedFeaturedImage(blogPosts[0].featuredImage)}
                  alt={blogPosts[0].title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.jpg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No image available</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300 bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-full px-3 py-1 border border-teal-200/50 dark:border-teal-800/50">
                  {blogPosts[0].category}
                </span>
              </div>
              <h2 className="text-3xl font-bold">{blogPosts[0].title}</h2>
              <p className="text-muted-foreground text-lg">{blogPosts[0].excerpt}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {new Date(blogPosts[0].date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {getAuthorName(blogPosts[0].author)}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {blogPosts[0].readingTime || '5 min read'}
                </div>
              </div>
              <Button asChild className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 hover:from-teal-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25">
                <Link href={`/blog/${blogPosts[0].slug || blogPosts[0]._id}`}>
                  Read Article
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Blog post grid - skip featured post on first page */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {(currentPage === 1 ? blogPosts.slice(1) : blogPosts).map(post => (
          <Card key={post._id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="h-48 overflow-hidden bg-muted/50">
              {post.featuredImage ? (
                <img 
                  src={getProxiedFeaturedImage(post.featuredImage)}
                  alt={post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.jpg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No image available</span>
                </div>
              )}
            </div>
            <CardContent className="p-4 flex-1">
              <div className="mb-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                  {post.category}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
                <Link href={`/blog/${post.slug || post._id}`}>
                  {post.title}
                </Link>
              </h3>
              <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                {post.tags.slice(0, 3).map((tag, index) => (
                  <button
                    key={`${post._id}-tag-${index}`}
                    onClick={() => handleTagClick(tag)}
                    className="text-xs bg-muted/50 hover:bg-muted rounded px-2 py-1 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
                {post.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">
                    +{post.tags.length - 3} more
                  </span>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {new Date(post.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {post.readingTime || '5 min'}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/blog/${post.slug || post._id}`}>
                  Read More
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Pagination - SERVER-SIDE */}
      {totalPages > 1 && (
        <div className="mb-12">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <p className="text-center text-sm text-muted-foreground mt-4">
            Showing {((currentPage - 1) * postsPerPage) + 1} to {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts} posts
          </p>
        </div>
      )}
      
      {/* Tags section */}
      <div className="border-t pt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Popular Topics</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAllTags(!showAllTags)}
          >
            {showAllTags ? 'Show Less' : 'Show All'}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-8">
          {(showAllTags ? allTags : allTags.slice(0, 10)).map((tag, index) => (
            <Button 
              key={`tag-btn-${tag}-${index}`} 
              variant={activeTag === tag ? "default" : "outline"} 
              size="sm" 
              className="h-8"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
              {activeTag === tag && <X className="ml-2 h-3 w-3" />}
            </Button>
          ))}
        </div>
      </div>
      
      {/* No results message */}
      {blogPosts.length === 0 && !loading && (
        <div className="text-center py-12 my-8 bg-muted/30 rounded-lg border">
          <h3 className="text-xl font-semibold mb-2">No matching posts found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setActiveCategory(null)
              setActiveTag(null)
              setSearchInput('')
              setSearchQuery('')
              setCurrentPage(1)
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </>
  )
} 