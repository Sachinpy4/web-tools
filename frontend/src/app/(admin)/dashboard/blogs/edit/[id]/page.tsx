'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { withAdminAuth } from '@/middleware/authCheck'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { ImageUploader } from '@/components/image/ImageUploader'
import { Loader2 } from 'lucide-react'
import { apiRequest } from '@/lib/apiClient'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SeoMetadataEditor } from '@/components/seo/SeoMetadataEditor'
import { MediaLibrary } from '@/components/media/MediaLibrary'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { getProxiedImageUrl } from '@/lib/imageProxy'

// Define available categories
const DEFAULT_CATEGORIES = [
  'Web Development',
  'Performance',
  'Design',
  'SEO',
  'Formats',
  'Optimization',
  'Responsive Design',
  'Tools',
  'SVG',
  'Tutorials',
]

function EditBlogPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('content')
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [customCategory, setCustomCategory] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: DEFAULT_CATEGORIES[0],
    tags: '',
    status: 'draft',
    scheduledPublishDate: '',
    featuredImage: '',
    // SEO metadata
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [] as string[],
    canonicalUrl: '',
    ogImage: '',
    slug: '',
    commentsEnabled: true,
    requireCommentApproval: true,
    limitCommentsPerIp: true,
  })
  
  // State for interactive tag management
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  
  // Add a tag to the list
  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag]
      setTags(newTags)
      setTagInput('')
      // Update formData with the new comma-separated tags
      setFormData(prev => ({ ...prev, tags: newTags.join(', ') }))
    }
  }
  
  // Remove a tag from the list
  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    setTags(newTags)
    // Update formData with the new comma-separated tags
    setFormData(prev => ({ ...prev, tags: newTags.join(', ') }))
  }
  
  // Handle key press in the tag input (add tag on Enter)
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }
  
  // Fetch blog post data
  useEffect(() => {
    const fetchBlogPost = async () => {
      try {
        setIsLoading(true)
        
        interface BlogResponse {
          status: string;
          data: {
            _id: string;
            title: string;
            excerpt: string;
            content: string;
            category: string;
            tags: string[];
            status: string;
            featuredImage: string;
            metaTitle?: string;
            metaDescription?: string;
            metaKeywords?: string[];
            canonicalUrl?: string;
            ogImage?: string;
            [key: string]: any;
          };
        }
        
        // Check if we have a valid token before making the request
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
        
        if (!token || !user || user.role !== 'admin') {
          console.error('Authentication issue - redirecting to login');
          toast({
            title: 'Authentication Required',
            description: 'Please log in with admin credentials to edit blog posts.',
            variant: 'destructive',
          });
          
          // Clear any invalid auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Redirect to login
          router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        
        const response = await apiRequest<BlogResponse>(`/blogs/admin/${params.id}`, {
          requireAuth: true
        });
        const data = response.data;
        
        // Format tags as comma-separated string
        const tagsString = data.tags ? data.tags.join(', ') : '';
        
        // Set the tags array for the interactive tag component
        setTags(data.tags || []);
        
        // If the post has a category, check if it's already in our categories list
        if (data.category) {
          // Case-insensitive check if the category already exists in our list
          const categoryExists = categories.some(
            cat => cat.toLowerCase() === data.category.toLowerCase()
          );
          
          if (!categoryExists) {
            setCategories(prev => {
              // Double check again to avoid duplicates
              if (prev.some(cat => cat.toLowerCase() === data.category.toLowerCase())) {
                return prev;
              }
              return [...prev, data.category];
            });
          }
        }
        
        setFormData({
          title: data.title || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          category: data.category || DEFAULT_CATEGORIES[0],
          tags: tagsString,
          status: data.status || 'draft',
          scheduledPublishDate: data.scheduledPublishDate || '',
          featuredImage: data.featuredImage || '',
          // SEO metadata
          metaTitle: data.metaTitle || data.title || '',
          metaDescription: data.metaDescription || data.excerpt || '',
          metaKeywords: data.metaKeywords || [],
          canonicalUrl: data.canonicalUrl || '',
          ogImage: data.ogImage || '',
          slug: data.slug || '',
          commentsEnabled: data.commentsEnabled !== false,
          requireCommentApproval: data.requireCommentApproval !== false,
          limitCommentsPerIp: data.limitCommentsPerIp !== false,
        });
        
      } catch (error) {
        console.error('Error fetching blog post:', error);
        toast({
          title: 'Error',
          description: 'Failed to load blog post data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (params.id) {
      fetchBlogPost();
    }
  }, [params.id]); // Removed categories from dependency array to prevent loops
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Generate slug when title changes
    if (name === 'title') {
      // Create a URL-friendly slug from the title
      const slug = value.toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
        .substring(0, 100);       // Limit to 100 characters for reasonable URL length
      
      // Update the formData with the new slug
      setFormData(prev => ({ ...prev, slug: slug }));
    }
  };
  
  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };
  
  const handleImageChange = (url: string) => {
    // For featured images in blog posts, we can use the original URL since they're stored in the database
    // but for display purposes, the ImageUploader component will show the proxied version
    setFormData((prev) => ({ ...prev, featuredImage: url }));
  };
  
  const handleSeoChange = useCallback((seoData: any) => {
    setFormData(prev => ({ 
      ...prev, 
      // Ensure empty strings are respected, not replaced with previous values
      metaTitle: seoData.metaTitle !== undefined ? seoData.metaTitle : prev.metaTitle,
      metaDescription: seoData.metaDescription !== undefined ? seoData.metaDescription : prev.metaDescription,
      metaKeywords: seoData.metaKeywords || prev.metaKeywords,
      canonicalUrl: seoData.canonicalUrl !== undefined ? seoData.canonicalUrl : prev.canonicalUrl,
      ogImage: seoData.ogImage !== undefined ? seoData.ogImage : prev.ogImage
    }))
  }, []);
  
  const handleMediaSelect = (media: any) => {
    // For featured images selected from media library, use original URL for storage
    // Display will be handled by the ImageUploader component using proxied URLs
    setFormData(prev => ({ ...prev, featuredImage: media.url }))
  }
  
  const handleOgImageSelect = (media: any) => {
    // For OG images (used in public meta tags), use the proxied URL to hide backend
    const proxiedUrl = getProxiedImageUrl(media.url)
    setFormData(prev => ({ ...prev, ogImage: proxiedUrl || media.url }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      
      if (!formData.excerpt.trim()) {
        throw new Error('Excerpt is required');
      }
      
      if (!formData.content.trim()) {
        throw new Error('Content is required');
      }
      
      // Validate scheduled date if status is scheduled
      if (formData.status === 'scheduled' && !formData.scheduledPublishDate) {
        throw new Error('Publication date is required for scheduled posts');
      }
      
      // Process tags (comma-separated)
      const processedTags = formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      
      // Generate a slug if one doesn't exist
      let slug = formData.title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
        .substring(0, 100);       // Limit to 100 characters for reasonable URL length
      
      // Clean payload - only include fields that are in UpdateBlogDto
      const payload = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category,
        tags: processedTags,
        slug: slug,
        status: formData.status,
        featuredImage: formData.featuredImage || undefined,
        // SEO fields
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
        metaKeywords: formData.metaKeywords || undefined,
        canonicalUrl: formData.canonicalUrl && formData.canonicalUrl.trim() ? formData.canonicalUrl : undefined,
        ogImage: formData.ogImage || undefined,
        // Comment settings
        commentsEnabled: formData.commentsEnabled,
        requireCommentApproval: formData.requireCommentApproval,
        limitCommentsPerIp: formData.limitCommentsPerIp,
        // Date fields - only include if they have valid values
        ...(formData.status === 'scheduled' && formData.scheduledPublishDate ? {
          scheduledPublishDate: new Date(formData.scheduledPublishDate).toISOString()
        } : {}),
      };
      
      // Submit to API using apiClient
      await apiRequest(`/blogs/${params.id}`, {
        method: 'PUT',
        body: payload,
        requireAuth: true,
      });
      
      // Show success message
      toast({
        title: 'Blog post updated',
        description: `"${formData.title}" has been updated successfully.`,
      });
      
      // No redirection or opening in new tab
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update blog post',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePreview = () => {
    try {
      // Create a preview-optimized version with size limits
      const previewData = {
        ...formData,
        _id: params.id,
        slug: params.id,
        // Limit content size if needed
        content: formData.content.length > 100000 ? 
          formData.content.substring(0, 100000) + '... (content truncated for preview)' : 
          formData.content,
        // Remove base64 encoded images if present
        featuredImage: formData.featuredImage && formData.featuredImage.startsWith('data:image') ? 
          '' : formData.featuredImage
      }
      
      // Try to store in localStorage
      try {
        localStorage.setItem('blogPreview', JSON.stringify(previewData))
      } catch (storageError) {
        console.warn('Preview data too large for localStorage, creating simplified preview')
        // If it fails, create a more simplified version
        const minimalPreview = {
          _id: params.id,
          slug: params.id,
          title: formData.title,
          excerpt: formData.excerpt,
          content: 'Content too large for preview. Please save the post to view full content.',
          date: new Date().toISOString(),
          status: formData.status,
          category: formData.category,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        }
        localStorage.setItem('blogPreview', JSON.stringify(minimalPreview))
      }
      
      // Open preview in new tab
      window.open('/blog/preview', '_blank')
    } catch (error) {
      console.error('Error creating preview:', error)
      toast({
        title: 'Preview error',
        description: 'Could not generate preview due to content size limits. Try saving the post first.',
        variant: 'destructive'
      })
    }
  }
  
  // Function to remove a category
  const removeCategory = (categoryToRemove: string) => {
    // Don't allow removing the currently selected category
    if (formData.category === categoryToRemove) {
      toast({
        title: "Cannot remove active category",
        description: "Please select a different category first.",
        variant: "destructive",
      });
      return;
    }
    
    // Don't allow removing if there's only one category left
    if (categories.length <= 1) {
      toast({
        title: "Cannot remove category",
        description: "At least one category must remain.",
        variant: "destructive",
      });
      return;
    }
    
    const newCategories = categories.filter(cat => cat !== categoryToRemove);
    setCategories(newCategories);
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Blog Post</h1>
        <p className="text-muted-foreground mt-1">
          Update your blog post
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO & Metadata</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter a descriptive title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt *</Label>
                  <Input
                    id="excerpt"
                    name="excerpt"
                    value={formData.excerpt}
                    onChange={handleChange}
                    placeholder="Write a short description (150-200 characters)"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={handleContentChange}
                    placeholder="Write your blog post content here (supports formatting)"
                    enableAutoSave={true}
                    autoSaveKey={`edit-blog-${params.id}`}
                    autoSaveInterval={30000}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Featured Image</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ImageUploader
                        value={formData.featuredImage}
                        onChange={handleImageChange}
                        label="Upload Featured Image"
                        forBlog={true}
                        isFeatured={true}
                      />
                    </div>
                    <div>
                      <MediaLibrary
                        onSelect={handleMediaSelect}
                        allowedTypes={['image/*']}
                        triggerButton={
                          <Button variant="outline" className="w-full">
                            Select from Media Library
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="seo" className="space-y-6">
            <SeoMetadataEditor
              value={{
                metaTitle: formData.metaTitle,
                metaDescription: formData.metaDescription,
                metaKeywords: formData.metaKeywords,
                canonicalUrl: formData.canonicalUrl,
                ogImage: formData.ogImage
              }}
              onChange={handleSeoChange}
              title={formData.title}
              content={formData.content}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Open Graph Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <ImageUploader
                      value={formData.ogImage}
                      onChange={(url) => setFormData(prev => ({ ...prev, ogImage: url }))}
                      label="Upload OG Image"
                      forBlog={true}
                      isFeatured={true}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      This image will appear when your post is shared on social media.
                      Optimal size is 1200×630 pixels.
                    </p>
                  </div>
                  <div>
                    <MediaLibrary
                      onSelect={handleOgImageSelect}
                      allowedTypes={['image/*']}
                      triggerButton={
                        <Button variant="outline" className="w-full">
                          Select from Media Library
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="space-y-2">
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={(e) => {
                        handleChange(e);
                        // If status is not scheduled, clear scheduled date
                        if (e.target.value !== 'scheduled') {
                          setFormData(prev => ({ ...prev, scheduledPublishDate: '' }));
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                    
                    {formData.status === 'scheduled' && (
                      <div className="mt-2">
                        <Label htmlFor="scheduledPublishDate">Schedule Publication Date</Label>
                        <Input
                          id="scheduledPublishDate"
                          name="scheduledPublishDate"
                          type="datetime-local"
                          value={formData.scheduledPublishDate}
                          onChange={handleChange}
                          className="mt-1"
                          min={new Date().toISOString().slice(0, 16)}
                          required={formData.status === 'scheduled'}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          The post will be automatically published at this date and time
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <div className="space-y-2">
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {categories.map((category) => (
                        <option key={`category-${category}`} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    
                    <div className="mt-2">
                      <Label>Manage Categories</Label>
                      <div className="flex flex-wrap gap-2 my-2">
                        {categories.map((category) => (
                          <Badge 
                            key={`category-badge-${category}`} 
                            className="px-2 py-1 text-xs gap-1 items-center"
                            variant={formData.category === category ? "default" : "outline"}
                          >
                            {category}
                            {DEFAULT_CATEGORIES.includes(category) ? null : (
                              <X 
                                className="h-3 w-3 ml-1 cursor-pointer" 
                                onClick={() => removeCategory(category)}
                              />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        id="customCategory"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Add a custom category"
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const trimmedCategory = customCategory.trim();
                          // Case-insensitive check if category already exists
                          const categoryExists = categories.some(
                            cat => cat.toLowerCase() === trimmedCategory.toLowerCase()
                          );
                          
                          if (trimmedCategory && !categoryExists) {
                            // Use functional update to prevent race conditions
                            setCategories(prev => {
                              // Double-check again to ensure no duplicates
                              if (prev.some(cat => cat.toLowerCase() === trimmedCategory.toLowerCase())) {
                                return prev;
                              }
                              return [...prev, trimmedCategory];
                            });
                            setFormData(prev => ({ ...prev, category: trimmedCategory }));
                            setCustomCategory('');
                          } else if (categoryExists) {
                            toast({
                              title: "Category already exists",
                              description: "This category already exists in the list.",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={!customCategory.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <Badge key={`tag-badge-${tag}-${index}`} className="px-2 py-1 text-xs gap-1 items-center">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="tagInput"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add a tag and press Enter"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addTag}
                      disabled={!tagInput.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter tags separated by commas or press Enter after each tag
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Comment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="commentsEnabled">Enable Comments</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow readers to comment on this blog post
                    </p>
                  </div>
                  <Switch
                    id="commentsEnabled"
                    name="commentsEnabled"
                    checked={formData.commentsEnabled !== false}
                    onCheckedChange={(checked: boolean) => 
                      setFormData(prev => ({ ...prev, commentsEnabled: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="requireCommentApproval">Require Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Comments must be approved before appearing publicly
                    </p>
                  </div>
                  <Switch
                    id="requireCommentApproval"
                    name="requireCommentApproval"
                    checked={formData.requireCommentApproval !== false}
                    onCheckedChange={(checked: boolean) => 
                      setFormData(prev => ({ ...prev, requireCommentApproval: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="limitCommentsPerIp">Limit Comments Per IP</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow only one comment per IP address
                    </p>
                  </div>
                  <Switch
                    id="limitCommentsPerIp"
                    name="limitCommentsPerIp"
                    checked={formData.limitCommentsPerIp !== false}
                    onCheckedChange={(checked: boolean) => 
                      setFormData(prev => ({ ...prev, limitCommentsPerIp: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handlePreview}
            disabled={isSubmitting || !formData.title || !formData.content}
          >
            Preview
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !formData.title || !formData.excerpt || !formData.content}
          >
            {isSubmitting ? 'Saving...' : 'Update'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default withAdminAuth(EditBlogPage); 