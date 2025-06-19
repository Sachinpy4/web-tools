'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, Search, Image as ImageIcon, File, Upload, X, Trash2, Info, 
  Calendar, FileType, CheckCircle, XCircle
} from 'lucide-react'
import { apiRequest, getApiUrl } from '@/lib/apiClient'
import { toast } from '@/components/ui/use-toast'
import { formatFileSize } from '@/lib/utils'
import { getProxiedImageUrl } from '@/lib/imageProxy'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Media item interface
interface Media {
  _id: string
  filename: string
  originalname: string
  url: string
  mimetype: string
  alt?: string
  size: number
  width?: number
  height?: number
  tags?: string[]
  createdAt: string
  uses: number
}

// Props for the component
interface MediaLibraryProps {
  onSelect: (media: Media) => void
  triggerButton?: React.ReactNode
  selectedId?: string
  allowedTypes?: string[]
  contextType?: string
}

export function MediaLibrary({
  onSelect,
  triggerButton,
  selectedId,
  allowedTypes = ['image/*'],
  contextType
}: MediaLibraryProps) {
  // State
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'all' | 'images' | 'documents'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [limit] = useState(20)
  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null)
  const [imageInfoDialogOpen, setImageInfoDialogOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  
  // Fetch media from API
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      if (search) {
        queryParams.append('search', search)
      }
      
      if (type === 'images') {
        queryParams.append('type', 'image')
      } else if (type === 'documents') {
        queryParams.append('type', 'application')
      }
      
      const response = await apiRequest<{
        status: string;
        total: number;
        pages: number;
        data: Media[];
      }>(`/media?${queryParams.toString()}`, {
        requireAuth: true
      })
      
      // Fix URLs to ensure they're absolute with correct backend domain
      const baseApiUrl = getApiUrl().replace('/api', '')
      const mediaWithFixedUrls = response.data.map(item => {
        let url = item.url
        if (url.startsWith('/')) {
          url = `${baseApiUrl}${url}`
        }
        return {
          ...item,
          url
        }
      })
      
      setMedia(mediaWithFixedUrls)
      setTotalPages(response.pages)
      setTotalItems(response.total)
    } catch (error) {
      console.error('Error fetching media:', error)
      toast({
        title: 'Error',
        description: 'Failed to load media items',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, type])
  
  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (open) {
      fetchMedia()
    }
  }, [fetchMedia, page, limit, type, open])
  
  // Reset page when search or type changes
  useEffect(() => {
    setPage(1)
  }, [search, type])
  
  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const files = e.target.files
    const formData = new FormData()
    
    // Add each file to the form data
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    
    // Add alt text array as JSON string
    const altTexts = Array.from(files).map(file => file.name.split('.')[0])
    formData.append('alt', JSON.stringify(altTexts))
    
    try {
      setUploading(true)
      setUploadProgress(0)
      
      // Build URL with query parameter for contextType
      let url = '/media'
      if (contextType) {
        // Add as query parameter instead of form data
        const queryParams = new URLSearchParams({ type: contextType }).toString()
        url = `/media?${queryParams}`
      }
      
      // Simulate upload progress if multiple files
      let progressInterval: NodeJS.Timeout | null = null
      if (files.length > 1) {
        progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev === null) return 5
            return Math.min(prev + Math.random() * 15, 95)
          })
        }, 500)
      }
      
      const response = await apiRequest<{
        status: string;
        data: Media[];
      }>(url, {
        method: 'POST',
        body: formData,
        requireAuth: true,
        isFormData: true
      })
      
      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      // Set progress to 100% when completed
      setUploadProgress(100)
      
      // Fix URLs to ensure they're absolute with correct backend domain
      const baseApiUrl = getApiUrl().replace('/api', '')
      
      // Update URLs in the returned data
      const mediaWithFixedUrls = response.data.map(item => {
        let url = item.url
        if (url.startsWith('/')) {
          url = `${baseApiUrl}${url}`
        }
        return {
          ...item,
          url
        }
      })
      
      toast({
        title: 'Upload successful',
        description: `${files.length > 1 ? `${files.length} files have` : '1 file has'} been uploaded to the media library`,
      })
      
      // Refresh media list
      fetchMedia()
      
      // Select the last uploaded file (typically what the user wants to use)
      if (mediaWithFixedUrls.length > 0) {
        onSelect(mediaWithFixedUrls[mediaWithFixedUrls.length - 1])
      }
      
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(null)
      }, 2000)
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: 'Upload failed',
        description: 'There was a problem uploading your files',
        variant: 'destructive'
      })
      setUploadProgress(null)
    } finally {
      setUploading(false)
      
      // Clear the input
      e.target.value = ''
    }
  }
  
  // Filter media by allowed types
  const isAllowedType = (mimetype: string) => {
    if (allowedTypes.includes('*/*')) return true
    
    return allowedTypes.some(allowedType => {
      if (allowedType.endsWith('/*')) {
        const typePrefix = allowedType.split('/')[0]
        return mimetype.startsWith(`${typePrefix}/`)
      }
      return mimetype === allowedType
    })
  }
  
  const filteredMedia = media.filter(item => isAllowedType(item.mimetype))
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchMedia()
  }
  
  // Is an item selected
  const isSelected = (id: string) => selectedId === id
  
  // Handle media selection
  const handleSelect = (item: Media) => {
    onSelect(item)
    setOpen(false)
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Handle delete media
  const handleDeleteMedia = async (id: string) => {
    try {
      await apiRequest(`/media/${id}`, {
        method: 'DELETE',
        requireAuth: true
      })
      
      toast({
        title: 'Media deleted',
        description: 'The media item has been deleted successfully',
      })
      
      // Remove from local state
      setMedia(prevMedia => prevMedia.filter(item => item._id !== id))
      setDeleteDialogOpen(false)
      setMediaToDelete(null)
    } catch (error) {
      console.error('Error deleting media:', error)
      toast({
        title: 'Delete failed',
        description: 'There was a problem deleting the media item',
        variant: 'destructive'
      })
    }
  }
  
  // Open delete confirmation dialog
  const openDeleteDialog = (item: Media, e: React.MouseEvent) => {
    e.stopPropagation()
    setMediaToDelete(item)
    setDeleteDialogOpen(true)
  }
  
  // Open image info dialog
  const showImageInfo = (item: Media, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedMedia(item)
    setImageInfoDialogOpen(true)
  }
  
  // Helper function to get display URL (proxied for images)
  const getDisplayUrl = (item: Media) => {
    if (item.mimetype.startsWith('image/')) {
      return getProxiedImageUrl(item.url) || item.url
    }
    return item.url
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="w-full">
            <ImageIcon className="mr-2 h-4 w-4" />
            Select from Media Library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Browse, upload, and select media files for your content. You can upload images and documents, then click on any item to select it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 grid gap-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setType(v as any)}>
              <TabsList className="mb-2">
                <TabsTrigger value="all">All Media</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search media..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button type="submit" variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </Tabs>
            
            <div className="flex items-center">
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleUpload}
                accept={allowedTypes.join(',')}
                multiple
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Files
              </Button>
            </div>
          </div>
          
          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading {uploadProgress === 100 ? 'Complete' : '...'}</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No media items found</p>
              {type !== 'all' && (
                <p className="text-sm mt-1">Try switching to "All Media" or uploading a new file</p>
              )}
              {search && (
                <div className="mt-2 flex justify-center">
                  <Badge onClick={() => setSearch('')} className="cursor-pointer">
                    {search} <X className="h-3 w-3 ml-1" />
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMedia.map((item) => {
                const isImage = item.mimetype.startsWith('image/')
                
                return (
                  <Card 
                    key={item._id}
                    className={`relative cursor-pointer overflow-hidden border-2 ${
                      isSelected(item._id) ? 'border-primary' : 'border-transparent hover:border-muted'
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="aspect-square relative">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={getDisplayUrl(item)}
                          alt={item.alt || item.originalname}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-muted">
                          <File className="h-10 w-10 text-muted-foreground" />
                          <span className="text-xs mt-2 px-2 text-center text-muted-foreground line-clamp-1">
                            {item.originalname}
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute inset-x-0 bottom-0 bg-background/80 p-1 text-xs">
                        <div className="line-clamp-1 font-medium">{item.originalname}</div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{formatFileSize(item.size)}</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Add action buttons for info and delete */}
                      <div className="absolute top-1 right-1 flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
                                onClick={(e) => showImageInfo(item, e)}
                              >
                                <Info className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Image Info</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background text-rose-500 hover:text-rose-700"
                                onClick={(e) => openDeleteDialog(item, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Image</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
          
          {totalPages > 1 && (
            <Pagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      </DialogContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this media item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {mediaToDelete && (
            <div className="flex items-center space-x-4 py-4">
              {mediaToDelete.mimetype.startsWith('image/') ? (
                <div className="h-20 w-20 rounded border overflow-hidden">
                  <img 
                    src={getDisplayUrl(mediaToDelete)} 
                    alt={mediaToDelete.alt || mediaToDelete.originalname} 
                    className="h-full w-full object-cover" 
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded border flex items-center justify-center bg-muted">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{mediaToDelete.originalname}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(mediaToDelete.size)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => mediaToDelete && handleDeleteMedia(mediaToDelete._id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Image Info Dialog */}
      <Dialog open={imageInfoDialogOpen} onOpenChange={setImageInfoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Media Information</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="grid gap-4">
              {selectedMedia.mimetype.startsWith('image/') && (
                <div className="rounded-md border overflow-hidden">
                  <img 
                    src={getDisplayUrl(selectedMedia)} 
                    alt={selectedMedia.alt || selectedMedia.originalname} 
                    className="w-full object-contain max-h-64" 
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Original filename:</span>
                  </div>
                  <p className="text-sm pl-6">{selectedMedia.originalname}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">System filename:</span>
                  </div>
                  <p className="text-sm pl-6">{selectedMedia.filename}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Uploaded:</span>
                  </div>
                  <p className="text-sm pl-6">{formatDate(selectedMedia.createdAt)}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">File size:</span>
                  </div>
                  <p className="text-sm pl-6">{formatFileSize(selectedMedia.size)}</p>
                </div>
                
                {selectedMedia.width && selectedMedia.height && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Dimensions:</span>
                    </div>
                    <p className="text-sm pl-6">{selectedMedia.width}×{selectedMedia.height}px</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">MIME type:</span>
                  </div>
                  <p className="text-sm pl-6">{selectedMedia.mimetype}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImageInfoDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
} 