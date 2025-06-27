'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  CalendarIcon,
  Clock,
  Facebook,
  Link2,
  Tag,
  Twitter,
  EyeIcon,
  Linkedin,
  Share2,
  MessageSquare,
  List,
  Heart,
  Copy,
  ChevronUp,
  Share,
  Instagram,
  X,
  ArrowLeft,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/imageProxy'
import { BlogPost, Comment, HeadingInfo } from './types'
import { 
  formatCommentDate, 
  processContentImages, 
  getProxiedFeaturedImage,
  copyToClipboard,
  shareOnSocial,
  getAuthorName,
  getAuthorInitials
} from './utils'
import { WhatsAppIcon } from './WhatsAppIcon'
import { useBlogPostData } from './useBlogPostData'
import { useComments } from './useComments'
import { useScrollTracking } from './useScrollTracking'
// Import editor styles for proper content rendering
import { EditorStyles } from '@/components/editor/styles/EditorStyles'
// Import syntax highlighting
import { lowlight } from 'lowlight'
import { toHtml } from 'hast-util-to-html'

interface BlogPostClientProps {
  post: BlogPost
}

export function BlogPostClient({ post: initialPost }: BlogPostClientProps) {
  // Use the blog post data hook
  const {
    post,
    relatedPosts,
    loading,
    error,
    headings,
    liked,
    likeCount,
    handleLike,
    categories,
    latestPosts
  } = useBlogPostData(initialPost._id)
  
  // Use the comments hook
  const {
    comments,
    commentCount,
    commentText,
    setCommentText,
    commentName,
    setCommentName,
    commentEmail,
    setCommentEmail,
    showComments,
    setShowComments,
    isSubmittingComment,
    hasSubmittedComment,
    hasMoreComments,
    isLoadingMoreComments,
    handleLoadMoreComments,
    handleSubmitComment
  } = useComments(post || initialPost)
  
  // Use the scroll tracking hook
  const {
    activeHeading,
    readingProgress,
    showScrollTop,
    isTocOpen,
    setIsTocOpen,
    articleRef,
    handleScrollToTop
  } = useScrollTracking(headings)

  // Use the post from the hook if available, fallback to initial post
  const currentPost = post || initialPost

  // Add code block copy functionality and syntax highlighting
  React.useEffect(() => {
    // lowlight is already initialized with common languages in v2

    const addCopyButtonsToCodeBlocks = () => {
      const codeBlocks = document.querySelectorAll('pre:not([data-copy-processed])')
      
      codeBlocks.forEach((pre) => {
        // Mark as processed to avoid duplicate processing
        pre.setAttribute('data-copy-processed', 'true')

        // Apply syntax highlighting if lowlight is available
        const codeElement = pre.querySelector('code')
        if (codeElement && lowlight) {
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

    // Initial processing with small delay to ensure DOM is ready
    const timeoutId = setTimeout(addCopyButtonsToCodeBlocks, 100)
    
    // Create a MutationObserver to handle dynamically added content
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if any added nodes contain pre elements
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (element.tagName === 'PRE' || element.querySelector('pre')) {
                shouldProcess = true
              }
            }
          })
        }
      })
      
      if (shouldProcess) {
        setTimeout(addCopyButtonsToCodeBlocks, 50)
      }
    })
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
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
  }, [])

  return (
    <>
      {/* Reading progress bar */}
      <div 
        className="fixed top-0 left-0 z-50 h-1 bg-primary transition-all duration-300 ease-out"
        style={{ width: `${readingProgress}%` }}
      />

      {/* Back button and action buttons */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="group">
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Articles
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={handleLike}
            disabled={loading || liked}
            title={liked ? "You've already liked this article" : "Like this article"}
          >
            <Heart className={cn("h-4 w-4 transition-all", liked ? "fill-red-500 text-red-500" : "")} />
            <span>{likeCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={copyToClipboard}
          >
            <Share className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Share</span>
          </Button>
        </div>
      </div>

      {/* Category tag */}
      <div className="mb-4">
        <Badge variant="outline" className="text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10">
          {currentPost.category}
        </Badge>
      </div>

      {/* Header */}
      <div className="mb-10 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">{currentPost.title}</h1>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed font-medium">
          {currentPost.excerpt}
        </p>
        
        {/* Featured image with optimized loading */}
        <div className="mb-12 relative overflow-hidden rounded-2xl">
          <div className="aspect-[16/9] w-full transform transition-transform duration-700 hover:scale-105 bg-muted/50">
            {currentPost.featuredImage ? (
              <img 
                src={getProxiedImageUrl(currentPost.featuredImage)} 
                alt={currentPost.title}
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = '/placeholder.jpg';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground">No image available</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Author and metadata */}
        <div className="flex flex-wrap items-center gap-6 py-4 border-y">
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-3 border-2 border-background ring-2 ring-primary/10">
              {/* Use AvatarImage if available */}
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getAuthorInitials(currentPost.author)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-base">{getAuthorName(currentPost.author)}</div>
              <div className="text-xs text-muted-foreground">Author</div>
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1.5 text-muted-foreground/70" />
              <span suppressHydrationWarning>
                {new Date(currentPost.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-muted-foreground/70" />
              {currentPost.readingTime || '5 min read'}
            </div>
            <div className="flex items-center">
              <EyeIcon className="h-4 w-4 mr-1.5 text-muted-foreground/70" />
              {currentPost.views} views
            </div>
          </div>
        </div>
      </div>

      {/* Categories and Latest Posts - Mobile View */}
      <div className="lg:hidden mb-8">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Link href={`/blog?category=${encodeURIComponent(category)}`} key={category}>
                  <Badge 
                    variant="outline" 
                    className="px-3 py-1 rounded-full text-sm font-normal hover:bg-primary/10 transition-colors"
                  >
                    {category}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Latest Posts */}
        {latestPosts.length > 0 && latestPosts.some(p => p._id !== currentPost?._id) && (
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Latest Posts
            </h3>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {latestPosts
                    .filter(p => p._id !== currentPost?._id)
                    .map(latest => (
                      <div key={latest._id} className="group">
                        <Link 
                          href={`/blog/${latest.slug || latest._id}`}
                          className="block py-1 group-hover:text-primary transition-colors"
                        >
                          <div className="text-sm font-medium line-clamp-2 mb-1">
                            {latest.title}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            <span suppressHydrationWarning>
                              {new Date(latest.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </Link>
                        {latestPosts.indexOf(latest) < latestPosts.filter(p => p._id !== currentPost?._id).length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Main content */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12 mb-12">
        {/* Table of contents - Mobile */}
        <div className="lg:hidden sticky top-16 z-30 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 mb-2 w-full justify-between backdrop-blur-sm bg-background/80"
            onClick={() => setIsTocOpen(!isTocOpen)}
          >
            <span className="flex items-center">
              <List className="h-4 w-4 mr-2" />
              Table of Contents
            </span>
            <span className={`transition-transform duration-300 ${isTocOpen ? 'rotate-180' : ''}`}>
              <ChevronUp className="h-4 w-4" />
            </span>
          </Button>
          
          {isTocOpen && (
            <Card className="mt-1 animate-in slide-in-from-top-4 fade-in duration-300 shadow-lg">
              <CardContent className="p-4">
                <nav className="toc text-sm">
                  <ul className="space-y-2">
                    {headings.map((heading) => (
                      <li 
                        key={heading.id} 
                        style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}
                      >
                        <a
                          href={`#${heading.id}`}
                          className={cn(
                            "block hover:text-primary transition-colors py-1",
                            activeHeading === heading.id ? "text-primary font-medium" : "text-muted-foreground"
                          )}
                          onClick={() => setIsTocOpen(false)}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Main article */}
        <article ref={articleRef} className="lg:col-span-8 prose prose-lg dark:prose-invert max-w-none prose-table:mx-auto prose-table:border-collapse prose-pre:!bg-transparent prose-pre:!p-0 prose-pre:!border-0 prose-pre:!overflow-visible">
          <div 
            dangerouslySetInnerHTML={{ __html: processContentImages(currentPost.content) }} 
            className="prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto prose-headings:scroll-mt-20 prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed prose-headings:leading-tight prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:px-6 prose-blockquote:py-1 prose-blockquote:italic prose-code:text-sm prose-code:bg-muted/80 prose-code:rounded prose-code:px-1 prose-code:py-0.5"
          />
          
          {/* Tags below article */}
          {currentPost.tags && currentPost.tags.length > 0 && (
            <div className="not-prose mt-12">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentPost.tags.map((tag, index) => (
                  <Badge key={`tag-${tag}-${index}`} variant="outline" className="px-3 py-1 rounded-full text-sm font-normal hover:bg-primary/10 transition-colors">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Like and share section */}
          <div className="not-prose mt-12 border-t pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant={liked ? "default" : "outline"} 
                size="sm" 
                className={cn(
                  "gap-2 transition-all rounded-full",
                  liked ? "bg-primary/90 hover:bg-primary" : ""
                )}
                onClick={handleLike}
                disabled={loading || liked}
                title={liked ? "You've already liked this article" : "Like this article"}
              >
                <Heart className={cn("h-4 w-4 transition-all", liked ? "fill-primary-foreground" : "")} />
                {liked ? "Liked" : "Like"} 
                <span className="font-normal">({likeCount})</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 rounded-full"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className="h-4 w-4" />
                Comments <span className="font-normal">({commentCount})</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={copyToClipboard} className="flex items-center gap-1 rounded-full">
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={() => shareOnSocial('twitter', currentPost)}
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={() => shareOnSocial('facebook', currentPost)}
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={() => shareOnSocial('linkedin', currentPost)}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={() => shareOnSocial('whatsapp', currentPost)}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={() => shareOnSocial('instagram', currentPost)}
                >
                  <Instagram className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="not-prose mt-8 border-t pt-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({commentCount})
              </h3>
              
              {/* Comment form */}
              <div className="mb-8 space-y-4">
                {hasSubmittedComment && currentPost.limitCommentsPerIp && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/20">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Comment Already Submitted</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You have already posted a comment on this article. Only one comment per person is allowed.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="commentName">Name *</Label>
                    <Input
                      id="commentName"
                      placeholder="Your name"
                      className="mt-1"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      disabled={hasSubmittedComment && currentPost.limitCommentsPerIp}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="commentEmail">Email * <span className="text-xs text-muted-foreground">(will not be displayed)</span></Label>
                    <Input
                      id="commentEmail"
                      type="email"
                      placeholder="Your email address"
                      className="mt-1"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      disabled={hasSubmittedComment && currentPost.limitCommentsPerIp}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="commentText">Comment * <span className="text-xs text-muted-foreground">(no links or web addresses allowed)</span></Label>
                  <Textarea
                    id="commentText"
                    placeholder={hasSubmittedComment && currentPost.limitCommentsPerIp ? "You have already submitted a comment for this article" : "Write your comment here..."}
                    className="resize-none mt-1 h-24"
                    value={commentText}
                    onChange={(e) => {
                      setCommentText(e.target.value);
                    }}
                    disabled={hasSubmittedComment && currentPost.limitCommentsPerIp}
                    required
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitComment} 
                    disabled={!commentText.trim() || !commentName.trim() || !commentEmail.trim() || isSubmittingComment || (hasSubmittedComment && currentPost.limitCommentsPerIp)}
                  >
                    {isSubmittingComment ? 'Posting...' : (hasSubmittedComment && currentPost.limitCommentsPerIp) ? 'Comment Already Submitted' : 'Post Comment'}
                  </Button>
                </div>
              </div>
              
              {/* Comments list */}
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </div>
                ) : (
                  <>
                    {comments.map(comment => (
                      <div key={comment._id} className="flex gap-4 border-b pb-6">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-muted">
                            {comment.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-sm">
                                {comment.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                <span suppressHydrationWarning>
                                  {formatCommentDate(comment.createdAt)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    {hasMoreComments && (
                      <div className="flex justify-center mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleLoadMoreComments}
                          disabled={isLoadingMoreComments}
                        >
                          {isLoadingMoreComments ? (
                            <>
                              <span className="mr-2">Loading...</span>
                              <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </>
                          ) : (
                            <>
                              Load More Comments
                              <span className="ml-1 text-xs">({commentCount - comments.length} more)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </article>
        
        {/* Sidebar */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-20 space-y-8">
            {/* Table of contents - Desktop */}
            {headings.length > 0 && (
              <Card className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Table of Contents
                  </h3>
                  <nav className="toc text-sm">
                    <ul className="space-y-2.5">
                      {headings.map((heading) => (
                        <li 
                          key={heading.id}
                          className="border-l-2 pl-3 transition-all"
                          style={{
                            paddingLeft: `${(heading.level - 1) * 0.75 + 0.75}rem`,
                            borderLeftColor: activeHeading === heading.id ? 'var(--primary)' : 'transparent'
                          }}
                        >
                          <a
                            href={`#${heading.id}`}
                            className={cn(
                              "block hover:text-primary transition-colors py-1",
                              activeHeading === heading.id ? "text-primary font-medium" : "text-muted-foreground"
                            )}
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </CardContent>
              </Card>
            )}
            
            {/* Quick share */}
            <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share this article
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => shareOnSocial('twitter', currentPost)}
                  >
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => shareOnSocial('facebook', currentPost)}
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => shareOnSocial('linkedin', currentPost)}
                  >
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => shareOnSocial('whatsapp', currentPost)}
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => shareOnSocial('instagram', currentPost)}
                  >
                    <Instagram className="h-4 w-4" />
                  </Button>
                </div>
                <Separator className="my-4" />
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
              </CardContent>
            </Card>
            
            {/* Categories section */}
            {categories.length > 0 && (
              <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <Link href={`/blog?category=${encodeURIComponent(category)}`} key={category}>
                        <Badge 
                          variant="outline" 
                          className="px-3 py-1 rounded-full text-sm font-normal hover:bg-primary/10 transition-colors"
                        >
                          {category}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Latest posts section */}
            {latestPosts.length > 0 && latestPosts.some(p => p._id !== currentPost?._id) && (
              <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Latest Posts
                  </h3>
                  <div className="space-y-4">
                    {latestPosts
                      .filter(p => p._id !== currentPost?._id)
                      .map(latest => (
                        <div key={latest._id} className="group">
                          <Link 
                            href={`/blog/${latest.slug || latest._id}`}
                            className="block py-2 group-hover:text-primary transition-colors"
                          >
                            <div className="text-sm font-medium line-clamp-2 mb-1">
                              {latest.title}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              <span suppressHydrationWarning>
                                {new Date(latest.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <Separator orientation="vertical" className="h-3 mx-2" />
                              <Clock className="h-3 w-3 mr-1" />
                              {latest.readingTime || '5 min read'}
                            </div>
                          </Link>
                          {latestPosts.filter(p => p._id !== currentPost?._id).indexOf(latest) < 
                            latestPosts.filter(p => p._id !== currentPost?._id).length - 1 && (
                            <Separator className="mt-2" />
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
          </div>
        </aside>
      </div>
      
      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <span className="inline-block h-5 w-1 bg-primary rounded-full mr-1"></span>
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPosts.map(post => (
              <Card 
                key={post._id} 
                className="overflow-hidden flex flex-col h-full border group hover:shadow-md transition-all duration-300"
              >
                <div className="h-48 overflow-hidden bg-muted/50">
                  {post.featuredImage ? (
                    <img 
                      src={getProxiedImageUrl(post.featuredImage)} 
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback if image fails to load
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
                  <div className="space-y-3">
                    <Badge variant="outline" className="bg-primary/5 text-primary text-xs mb-2">
                      {post.category}
                    </Badge>
                    <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      <Link href={`/blog/${post.slug || post._id}`}>
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getAuthorInitials(post.author)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="mr-2">{getAuthorName(post.author)}</span>
                    <Separator orientation="vertical" className="h-3 mx-2" />
                    <Clock className="h-3 w-3 mr-1" />
                    {post.readingTime || '5 min read'}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Enhanced Scroll to top button */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 z-50 group">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out" />
          
          {/* Main button */}
          <Button
            onClick={handleScrollToTop}
            className="relative h-14 w-14 rounded-full shadow-2xl border border-white/10 backdrop-blur-md bg-background/80 hover:bg-primary hover:text-primary-foreground text-primary transition-all duration-300 ease-out transform hover:scale-110 active:scale-95 group"
            variant="ghost"
            aria-label="Scroll to top"
          >
            {/* Inner glow */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-primary/5 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Icon */}
            <ChevronUp className="h-6 w-6 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5" />
            
            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full bg-primary/10 scale-0 group-active:scale-100 transition-transform duration-150" />
          </Button>
          
          {/* Progress ring around button */}
          <svg 
            className="absolute inset-0 h-14 w-14 -rotate-90 transition-all duration-300"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/20"
            />
            <circle
              cx="28"
              cy="28"
              r="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-primary transition-all duration-300"
              style={{
                strokeDasharray: `${2 * Math.PI * 26}`,
                strokeDashoffset: `${2 * Math.PI * 26 * (1 - readingProgress / 100)}`
              }}
            />
          </svg>
        </div>
      )}

      {/* Global styles for editor content */}
      <EditorStyles />
    </>
  )
} 