'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function BlogContent() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [postsPerPage] = useState(6)
  const [showAllTags, setShowAllTags] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  
  // Fetch blogs from API
  const fetchBlogs = async () => {
    try {
      setLoading(true)
      
      // Build query params
      let endpoint = '/blogs/public'
      const queryParams = new URLSearchParams()
      
      if (activeCategory) {
        queryParams.append('category', activeCategory)
      }
      
      if (searchQuery) {
        queryParams.append('search', searchQuery)
      }
      
      if (activeTag) {
        queryParams.append('tag', activeTag)
      }
      
      const queryString = queryParams.toString()
      const finalEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint
      
      try {
        // Use the public endpoint for published blogs
        const response = await apiRequest<{
          status: string;
          data: BlogPost[];
        }>(finalEndpoint, { noRedirect: true })
        
        setBlogPosts(response.data || [])
        
        // Extract categories and tags
        const categories = Array.from(new Set(response.data.map(post => post.category)))
        setAllCategories(categories)
        
        const tags = Array.from(
          new Set(response.data.flatMap(post => post.tags))
        ).sort()
        setAllTags(tags)
        
        // Reset to first page when filter changes
        setCurrentPage(1)
      } catch (error) {
        console.error('Error fetching public blogs:', error)
        
        // If public endpoint fails, use fallback mock data
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
          {
            _id: '3',
            title: 'The Ultimate Guide to SVG: Why, When, and How',
            excerpt: 'Everything you need to know about SVG images - when to use them, how to optimize them, and their benefits.',
            content: 'Full content would go here...',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            author: { name: 'Mike Johnson', email: 'mike@example.com' },
            category: 'SVG',
            tags: ['SVG', 'Vector Graphics', 'Web Development', 'Design'],
            featuredImage: '/placeholder-image-3.jpg',
            views: 725,
            readingTime: '10 min read',
            slug: 'ultimate-guide-to-svg'
          },
        ]
        
        setBlogPosts(mockPosts)
        
        const categories = Array.from(new Set(mockPosts.map(post => post.category)))
        setAllCategories(categories)
        
        const tags = Array.from(
          new Set(mockPosts.flatMap(post => post.tags))
        ).sort()
        setAllTags(tags)
        
        // Reset to first page when filter changes
        setCurrentPage(1)
        
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
  }
  
  // Load data on component mount or when filters change
  useEffect(() => {
    fetchBlogs()
  }, [activeCategory, activeTag])
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBlogs()
  }
  
  // Format author name
  const getAuthorName = (author: { name: string; email: string } | string | null): string => {
    if (!author || typeof author === 'string') {
      return 'Anonymous'
    }
    return author.name || 'Anonymous'
  }
  
  // Filter posts by active category and tag
  const filteredPosts = blogPosts.filter(post => {
    // Apply category filter if active
    if (activeCategory && post.category !== activeCategory) {
      return false
    }
    
    // Apply tag filter if active
    if (activeTag && !post.tags.includes(activeTag)) {
      return false
    }
    
    return true
  })
  
  // Toggle tag filter
  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null)
    } else {
      setActiveTag(tag)
    }
  }
  
  // Pagination logic
  const indexOfLastPost = currentPage * postsPerPage
  const indexOfFirstPost = indexOfLastPost - postsPerPage
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost)
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage)
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)
  
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          
          <Tabs defaultValue="all" className="w-full md:w-auto">
            <TabsList className="w-full md:w-auto overflow-x-auto max-w-full flex-nowrap">
              <TabsTrigger value="all" onClick={() => setActiveCategory(null)}>
                All Categories
              </TabsTrigger>
              {allCategories.slice(0, 3).map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </TabsTrigger>
              ))}
              {allCategories.length > 3 && (
                <TabsTrigger 
                  value="more" 
                  onClick={() => {
                    // This would show a dropdown with all categories in a real implementation
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
      </div>
      
      {/* Featured post */}
      {filteredPosts.length > 0 && (
        <div className="mb-16 bg-gradient-to-br from-teal-50/50 via-blue-50/50 to-indigo-50/50 dark:from-teal-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 shadow-sm border border-teal-100/50 dark:border-teal-800/50">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-[350px] rounded-xl overflow-hidden bg-muted">
              {filteredPosts[0].featuredImage ? (
                <img 
                  src={getProxiedFeaturedImage(filteredPosts[0].featuredImage)}
                  alt={filteredPosts[0].title}
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
                  {filteredPosts[0].category}
                </span>
              </div>
              <h2 className="text-3xl font-bold">{filteredPosts[0].title}</h2>
              <p className="text-muted-foreground text-lg">{filteredPosts[0].excerpt}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {new Date(filteredPosts[0].date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {getAuthorName(filteredPosts[0].author)}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {filteredPosts[0].readingTime || '5 min read'}
                </div>
              </div>
              <Button asChild className="bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 hover:from-teal-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25">
                <Link href={`/blog/${filteredPosts[0].slug || filteredPosts[0]._id}`}>
                  Read Article
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Blog post grid - only show posts after the featured one */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {currentPosts.slice(currentPage === 1 ? 1 : 0).map(post => (
          <Card key={post._id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="h-48 overflow-hidden bg-muted/50">
              {post.featuredImage ? (
                <img 
                  src={getProxiedFeaturedImage(post.featuredImage)}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-300 ease-in-out"
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
            <CardContent className="py-6 flex-grow">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full px-2 py-1 border border-blue-200/50 dark:border-blue-800/50">
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {post.readingTime || '5 min read'}
                  </span>
                </div>
                <h3 className="font-bold text-xl min-h-[3rem] line-clamp-2">
                  <Link href={`/blog/${post.slug || post._id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {post.title}
                  </Link>
                </h3>
                <p className="text-muted-foreground line-clamp-3 min-h-[4.5rem]">
                  {post.excerpt}
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500/10 to-blue-500/10 border border-teal-200/50 dark:border-teal-800/50 flex items-center justify-center">
                  <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
                    {!post.author || typeof post.author === 'string' ? 
                      'A' : 
                      (post.author.name || 'A').split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="text-sm truncate max-w-[100px]">{getAuthorName(post.author)}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mb-12">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => paginate(currentPage - 1)}
            >
              Previous
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              // Show limited page numbers for better mobile view
              .filter(num => 
                num === 1 || 
                num === totalPages || 
                (num >= currentPage - 1 && num <= currentPage + 1)
              )
              .map((number, index, array) => {
                // Add ellipsis
                if (index > 0 && array[index - 1] !== number - 1) {
                  return (
                    <React.Fragment key={`ellipsis-${number}`}>
                      <Button variant="outline" size="sm" disabled className="px-3">
                        ...
                      </Button>
                      <Button
                        variant={currentPage === number ? "default" : "outline"}
                        size="sm"
                        onClick={() => paginate(number)}
                        className="px-3"
                      >
                        {number}
                      </Button>
                    </React.Fragment>
                  )
                }
                
                return (
                  <Button 
                    key={number}
                    variant={currentPage === number ? "default" : "outline"}
                    size="sm"
                    onClick={() => paginate(number)}
                    className="px-3"
                  >
                    {number}
                  </Button>
                )
              })
            }
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => paginate(currentPage + 1)}
            >
              Next
            </Button>
          </div>
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
      {filteredPosts.length === 0 && (
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
              setSearchQuery('')
              fetchBlogs()
            }}
          >
            Reset Filters
          </Button>
        </div>
      )}
    </>
  )
} 