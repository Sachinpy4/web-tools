'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Settings, 
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  ExternalLink,
  Download,
  Upload
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { withAdminAuth } from '@/middleware/authCheck'
import { apiRequest } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { SeoMetadataEditor } from '@/components/seo/SeoMetadataEditor'

// Types
interface PageSeo {
  _id: string;
  pagePath: string;
  pageType: 'homepage' | 'blog-listing' | 'tool' | 'about' | 'custom';
  pageName: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType: string;
  twitterCard: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface SeoFormData {
  pagePath: string;
  pageType: 'homepage' | 'blog-listing' | 'tool' | 'about' | 'custom';
  pageName: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  priority: number;
}

const pageTypeLabels = {
  homepage: 'Homepage',
  'blog-listing': 'Blog Listing',
  tool: 'Tool Page',
  about: 'About Page',
  custom: 'Custom Page'
}

const pageTypeColors = {
  homepage: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'blog-listing': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  tool: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  about: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
}

function SeoManagementPage() {
  const [pageSeos, setPageSeos] = useState<PageSeo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<PageSeo | null>(null)
  const [formData, setFormData] = useState<SeoFormData>({
    pagePath: '',
    pageType: 'custom',
    pageName: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [],
    canonicalUrl: '',
    ogImage: '',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    priority: 0
  })

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  // Fetch all page SEO settings
  const fetchPageSeos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiRequest<{ status: string; data: PageSeo[]; count: number }>('/seo', {
        requireAuth: true
      })
      
      setPageSeos(response.data || [])
    } catch (error: any) {
      console.error('Error fetching page SEO settings:', error)
      setError('Failed to load SEO settings. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load SEO settings.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Initialize default SEO settings
  const initializeDefaults = async () => {
    try {
      const response = await apiRequest<{ status: string; data: any }>('/seo/initialize', {
        method: 'POST',
        requireAuth: true
      })
      
      toast({
        title: 'Success',
        description: `Initialized default SEO settings.`,
      })
      
      fetchPageSeos()
    } catch (error: any) {
      console.error('Error initializing SEO settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to initialize default SEO settings.',
        variant: 'destructive',
      })
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      pagePath: '',
      pageType: 'custom',
      pageName: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: [],
      canonicalUrl: '',
      ogImage: '',
      ogType: 'website',
      twitterCard: 'summary_large_image',
      priority: 0
    })
    setEditingPage(null)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingPage) {
        // Update existing page
        await apiRequest(`/seo/${editingPage._id}`, {
          method: 'PUT',
          body: formData,
          requireAuth: true
        })
        
        toast({
          title: 'Success',
          description: 'SEO settings updated successfully.',
        })
      } else {
        // Create new page
        await apiRequest('/seo', {
          method: 'POST',
          body: formData,
          requireAuth: true
        })
        
        toast({
          title: 'Success',
          description: 'SEO settings created successfully.',
        })
      }
      
      setIsDialogOpen(false)
      resetForm()
      fetchPageSeos()
    } catch (error: any) {
      console.error('Error saving SEO settings:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save SEO settings.',
        variant: 'destructive',
      })
    }
  }

  // Handle edit
  const handleEdit = (page: PageSeo) => {
    setEditingPage(page)
    setFormData({
      pagePath: page.pagePath,
      pageType: page.pageType,
      pageName: page.pageName,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      canonicalUrl: page.canonicalUrl || '',
      ogImage: page.ogImage || '',
      ogType: page.ogType,
      twitterCard: page.twitterCard,
      priority: page.priority
    })
    setIsDialogOpen(true)
  }

  // Handle delete
  const handleDelete = async (id: string, pageName: string) => {
    if (!confirm(`Are you sure you want to delete SEO settings for "${pageName}"?`)) {
      return
    }
    
    try {
      await apiRequest(`/seo/${id}`, {
        method: 'DELETE',
        requireAuth: true
      })
      
      toast({
        title: 'Success',
        description: 'SEO settings deleted successfully.',
      })
      
      fetchPageSeos()
    } catch (error: any) {
      console.error('Error deleting SEO settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete SEO settings.',
        variant: 'destructive',
      })
    }
  }

  // Handle toggle active status
  const handleToggleStatus = async (id: string) => {
    try {
      await apiRequest(`/seo/${id}/toggle`, {
        method: 'PATCH',
        requireAuth: true
      })
      
      fetchPageSeos()
    } catch (error: any) {
      console.error('Error toggling SEO status:', error)
      toast({
        title: 'Error',
        description: 'Failed to toggle SEO status.',
        variant: 'destructive',
      })
    }
  }

  // Handle SEO metadata change
  const handleSeoChange = (seoData: any) => {
    setFormData(prev => ({
      ...prev,
      metaTitle: seoData.metaTitle || '',
      metaDescription: seoData.metaDescription || '',
      metaKeywords: seoData.metaKeywords || [],
      canonicalUrl: seoData.canonicalUrl || '',
      ogImage: seoData.ogImage || ''
    }))
  }

  // Filter pages
  const filteredPages = pageSeos.filter(page => {
    const matchesSearch = page.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.pagePath.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || page.pageType === selectedType
    const matchesStatus = showInactive || page.isActive
    return matchesSearch && matchesType && matchesStatus
  })

  useEffect(() => {
    fetchPageSeos()
  }, [])

  if (loading) {
    return <SeoManagementSkeleton />
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage SEO metadata for all pages (excluding admin pages).
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPageSeos}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={initializeDefaults}
          >
            <Download className="h-4 w-4 mr-2" />
            Initialize Defaults
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Page SEO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPage ? 'Edit' : 'Add'} Page SEO</DialogTitle>
                <DialogDescription>
                  Configure SEO metadata for a page. This will be used for search engines and social media.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pagePath">Page Path *</Label>
                    <Input
                      id="pagePath"
                      value={formData.pagePath}
                      onChange={(e) => setFormData(prev => ({ ...prev, pagePath: e.target.value }))}
                      placeholder="e.g., /, /blog, /image/compress"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pageType">Page Type *</Label>
                    <select
                      id="pageType"
                      value={formData.pageType}
                      onChange={(e) => setFormData(prev => ({ ...prev, pageType: e.target.value as any }))}
                      className="w-full h-10 px-3 border border-input bg-background rounded-md"
                      required
                    >
                      <option value="custom">Custom Page</option>
                      <option value="homepage">Homepage</option>
                      <option value="blog-listing">Blog Listing</option>
                      <option value="tool">Tool Page</option>
                      <option value="about">About Page</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pageName">Page Name *</Label>
                  <Input
                    id="pageName"
                    value={formData.pageName}
                    onChange={(e) => setFormData(prev => ({ ...prev, pageName: e.target.value }))}
                    placeholder="Human readable name for admin reference"
                    required
                  />
                </div>
                
                <SeoMetadataEditor
                  value={{
                    metaTitle: formData.metaTitle,
                    metaDescription: formData.metaDescription,
                    metaKeywords: formData.metaKeywords,
                    canonicalUrl: formData.canonicalUrl,
                    ogImage: formData.ogImage
                  }}
                  onChange={handleSeoChange}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ogType">OG Type</Label>
                    <select
                      id="ogType"
                      value={formData.ogType}
                      onChange={(e) => setFormData(prev => ({ ...prev, ogType: e.target.value }))}
                      className="w-full h-10 px-3 border border-input bg-background rounded-md"
                    >
                      <option value="website">Website</option>
                      <option value="article">Article</option>
                      <option value="product">Product</option>
                      <option value="profile">Profile</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitterCard">Twitter Card</Label>
                    <select
                      id="twitterCard"
                      value={formData.twitterCard}
                      onChange={(e) => setFormData(prev => ({ ...prev, twitterCard: e.target.value }))}
                      className="w-full h-10 px-3 border border-input bg-background rounded-md"
                    >
                      <option value="summary_large_image">Summary Large Image</option>
                      <option value="summary">Summary</option>
                      <option value="app">App</option>
                      <option value="player">Player</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPage ? 'Update' : 'Create'} SEO Settings
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by page name or path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full sm:w-48 h-10 px-3 border border-input bg-background rounded-md"
        >
          <option value="all">All Types</option>
          <option value="homepage">Homepage</option>
          <option value="blog-listing">Blog Listing</option>
          <option value="tool">Tool Pages</option>
          <option value="about">About Pages</option>
          <option value="custom">Custom Pages</option>
        </select>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
          className="w-full sm:w-auto"
        >
          {showInactive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </Button>
      </motion.div>

      {/* SEO Pages List */}
      <motion.div variants={itemVariants} className="space-y-4">
        {filteredPages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">
                {pageSeos.length === 0 
                  ? 'No SEO settings found. Click "Initialize Defaults" to get started.'
                  : 'No pages match your search criteria.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPages.map((page) => (
              <Card key={page._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{page.pageName}</h3>
                        <Badge className={pageTypeColors[page.pageType]}>
                          {pageTypeLabels[page.pageType]}
                        </Badge>
                        <Badge variant={page.isActive ? "default" : "secondary"}>
                          {page.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Path:</span>
                          <code className="bg-muted px-2 py-1 rounded text-xs">{page.pagePath}</code>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium">Title:</span>
                          <span className="text-muted-foreground">{page.metaTitle}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium">Description:</span>
                          <span className="text-muted-foreground line-clamp-2">{page.metaDescription}</span>
                        </div>
                        {page.metaKeywords.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium">Keywords:</span>
                            <div className="flex flex-wrap gap-1">
                              {page.metaKeywords.slice(0, 3).map((keyword) => (
                                <Badge key={keyword} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {page.metaKeywords.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{page.metaKeywords.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(page._id)}
                      >
                        {page.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(page)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(page._id, page.pageName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// Loading skeleton component
function SeoManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-48" />
      </div>
      
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex gap-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex gap-2 ml-4">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default withAdminAuth(SeoManagementPage) 