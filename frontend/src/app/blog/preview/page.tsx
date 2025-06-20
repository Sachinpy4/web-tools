'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Calendar, User, Tag, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { getProxiedImageUrl } from '@/lib/imageProxy'
// Import syntax highlighting
import { lowlight } from 'lowlight'
import { toHtml } from 'hast-util-to-html'

export default function BlogPreviewPage() {
  const [blog, setBlog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Get preview data from localStorage
    try {
      const previewData = localStorage.getItem('blogPreview')
      
      if (previewData) {
        try {
          const parsedData = JSON.parse(previewData)
          setBlog(parsedData)
        } catch (parseError) {
          console.error('Error parsing preview data:', parseError)
          toast({
            title: 'Preview error',
            description: 'There was an error loading the preview data.',
            variant: 'destructive'
          })
        }
      }
    } catch (storageError) {
      console.error('Error accessing localStorage:', storageError)
      toast({
        title: 'Storage error',
        description: 'Could not access browser storage. Preview may not work correctly.',
        variant: 'destructive'
      })
    }
    
    setLoading(false)
  }, [])

  // Add code block copy functionality and syntax highlighting
  useEffect(() => {
    // lowlight is already initialized with common languages in v2

    const addCopyButtonsToCodeBlocks = () => {
      const codeBlocks = document.querySelectorAll('pre:not([data-copy-processed])')
      
      codeBlocks.forEach((pre) => {
        // Mark as processed to avoid duplicate processing
        pre.setAttribute('data-copy-processed', 'true')

        // Apply syntax highlighting if lowlight is available
        const codeElement = pre.querySelector('code')
        if (codeElement) {
          const language = pre.getAttribute('data-language')
          if (language && language !== 'text' && language !== '') {
            try {
              const originalText = codeElement.textContent || ''
              const highlighted = lowlight.highlight(language, originalText)
              const highlightedHtml = toHtml(highlighted)
              
              // Create a temporary div to parse the HTML and extract just the content
              const tempDiv = document.createElement('div')
              tempDiv.innerHTML = highlightedHtml
              
              // Clear the code element and add the highlighted content
              codeElement.innerHTML = ''
              while (tempDiv.firstChild) {
                codeElement.appendChild(tempDiv.firstChild)
              }
            } catch (error) {
              // If highlighting fails, keep the original text
              console.warn(`Failed to highlight code with language "${language}":`, error)
            }
          }
        }
        
        // Create copy button container
        const copyButtonContainer = document.createElement('div')
        copyButtonContainer.className = 'absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 ease-in-out z-20'
        
        // Create copy button
        const copyButton = document.createElement('button')
        copyButton.className = 'flex items-center justify-center h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        copyButton.setAttribute('aria-label', 'Copy code to clipboard')
        copyButton.setAttribute('title', 'Copy code')
        
        // Modern copy icon
        const copyIcon = `
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        `
        
        // Success checkmark icon
        const copiedIcon = `
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
        `
        
        copyButton.innerHTML = copyIcon
        
        // Add click handler
        copyButton.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          const code = pre.querySelector('code')
          if (code) {
            try {
              // Add loading state
              copyButton.disabled = true
              copyButton.style.transform = 'scale(0.95)'
              
              await navigator.clipboard.writeText(code.textContent || '')
              
              // Success state with smooth animation
              copyButton.innerHTML = copiedIcon
              copyButton.className = copyButton.className.replace('text-muted-foreground', 'text-green-600')
              copyButton.setAttribute('aria-label', 'Code copied!')
              copyButton.setAttribute('title', 'Copied!')
              copyButton.style.transform = 'scale(1)'
              
              toast({
                title: 'Copied!',
                description: 'Code block content copied to clipboard.',
              })
              
              // Reset button after 1.5 seconds
              setTimeout(() => {
                copyButton.innerHTML = copyIcon
                copyButton.className = copyButton.className.replace('text-green-600', 'text-muted-foreground')
                copyButton.setAttribute('aria-label', 'Copy code to clipboard')
                copyButton.setAttribute('title', 'Copy code')
                copyButton.disabled = false
              }, 1500)
              
            } catch (err) {
              // Error state
              copyButton.innerHTML = `
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m15 9-6 6"/>
                  <path d="m9 9 6 6"/>
                </svg>
              `
              copyButton.className = copyButton.className.replace('text-muted-foreground', 'text-red-500')
              copyButton.style.transform = 'scale(1)'
              
              toast({
                title: 'Copy failed',
                description: 'Could not copy code to clipboard.',
                variant: 'destructive',
              })
              
              // Reset after error
              setTimeout(() => {
                copyButton.innerHTML = copyIcon
                copyButton.className = copyButton.className.replace('text-red-500', 'text-muted-foreground')
                copyButton.disabled = false
              }, 1500)
            }
          }
        })
        
        copyButtonContainer.appendChild(copyButton)
        
        // Make pre relative and add group class for hover effects
        const preElement = pre as HTMLElement
        preElement.style.position = 'relative'
        preElement.classList.add('group')
        
        // Add the copy button to the pre element
        preElement.appendChild(copyButtonContainer)
      })
    }

    // Only run if blog is loaded and has content
    if (blog?.content) {
      // Small delay to ensure DOM is ready
      setTimeout(addCopyButtonsToCodeBlocks, 100)
    }
    
    // Cleanup function
    return () => {
      // Remove all copy buttons and reset pre elements
      const processedPres = document.querySelectorAll('pre[data-copy-processed]')
      processedPres.forEach(pre => {
        pre.removeAttribute('data-copy-processed')
        pre.classList.remove('group')
        const copyButton = pre.querySelector('div.absolute')
        if (copyButton) {
          copyButton.remove()
        }
      })
    }
  }, [blog])
  
  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <p className="text-center">Loading preview...</p>
      </div>
    )
  }
  
  if (!blog) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-6">No Preview Data</h1>
        <p className="text-muted-foreground mb-8">No blog post preview data found.</p>
        <Button asChild>
          <Link href="/dashboard/blogs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog Management
          </Link>
        </Button>
      </div>
    )
  }
  
  // Function to process blog content and replace backend URLs with proxied ones
  const processContentImages = (htmlContent: string): string => {
    if (!htmlContent) return htmlContent
    
    // Replace backend image URLs in the HTML content with proxied URLs
    return htmlContent.replace(
      /src="([^"]*\/api\/media\/file\/[^"]*)"/g,
      (match, url) => {
        const proxiedUrl = getProxiedImageUrl(url)
        return `src="${proxiedUrl || url}"`
      }
    ).replace(
      /src='([^']*\/api\/media\/file\/[^']*)'/g,
      (match, url) => {
        const proxiedUrl = getProxiedImageUrl(url)
        return `src='${proxiedUrl || url}'`
      }
    )
  }

  // Helper function to get proxied featured image URL
  const getProxiedFeaturedImage = (imageUrl: string): string => {
    if (!imageUrl) return imageUrl
    return getProxiedImageUrl(imageUrl) || imageUrl
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/blogs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog Management
            </Link>
          </Button>
          
          <div className="mt-6 text-center">
            <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">{blog.excerpt}</p>
            
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(blog.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric'
                })}
              </div>
              
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                Preview Author
              </div>
              
              <div className="flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                {blog.category}
              </div>
              
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {blog.views || 0} views
              </div>
            </div>
          </div>
        </div>
        
        {blog.featuredImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={getProxiedFeaturedImage(blog.featuredImage)} 
              alt={blog.title} 
              className="w-full h-auto object-cover aspect-video"
            />
          </div>
        )}
        
        <Card>
          <CardContent className="p-8">
            <div 
              className="prose prose-lg max-w-none dark:prose-invert prose-img:rounded-lg prose-img:mx-auto prose-headings:scroll-mt-20 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:mx-auto prose-table:border-collapse"
              dangerouslySetInnerHTML={{ __html: processContentImages(blog.content) }}
            />
            
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(blog.tags) 
                    ? blog.tags.map((tag: string, index: number) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-muted rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))
                    : typeof blog.tags === 'string' && blog.tags.split(',').map((tag: string, index: number) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-muted rounded-full text-sm"
                      >
                        {tag.trim()}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">This is a preview of your blog post. It will not be visible to others until published.</p>
        </div>
      </div>
    </div>
  )
} 