'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Image as ImageIcon, Loader2, Settings2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { MediaLibrary } from '@/components/media/MediaLibrary'
import { getApiUrl } from '@/lib/apiClient'
import { getProxiedImageUrl } from '@/lib/imageProxy'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  label?: string
  forBlog?: boolean
  isFeatured?: boolean
}

export function ImageUploader({ 
  value, 
  onChange, 
  label = 'Image',
  forBlog = false,
  isFeatured = false
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(value)
  
  // Image optimization settings
  const [optimizeImage, setOptimizeImage] = useState(forBlog)
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState<'webp' | 'jpeg' | 'png'>('webp')
  const [isFeaturedImage, setIsFeaturedImage] = useState(isFeatured)
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file is an image
    if (!file.type.includes('image')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      })
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      })
      return
    }
    
    setIsUploading(true)
    
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('image', file)
      
      // Get base API URL
      const baseApiUrl = getApiUrl().replace('/api', '')
      
      // Determine upload endpoint based on optimization settings
      let uploadEndpoint = '/api/upload'
      
      if (optimizeImage) {
        uploadEndpoint = '/api/images/optimize-blog'
        formData.set('image', file) // Reset to ensure proper naming
        formData.append('quality', quality.toString())
        formData.append('format', format)
        formData.append('optimizeForBlog', 'true')
        formData.append('isFeatured', isFeaturedImage ? 'true' : 'false')
      }
      
      // Upload to backend
      const response = await fetch(`${baseApiUrl}${uploadEndpoint}`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload image')
      }
      
      const data = await response.json()
      const fileUrl = data.fileUrl || data.data?.fileUrl
      
      if (!fileUrl) {
        throw new Error('No file URL returned from server')
      }
      
      // Make sure the URL is absolute with the correct backend domain
      let fullUrl = fileUrl
      if (fileUrl.startsWith('/')) {
        fullUrl = `${baseApiUrl}${fileUrl}`
      }
      
      setImageUrl(fullUrl)
      onChange(fullUrl)
      
      toast({
        title: 'Image uploaded',
        description: 'Your image has been uploaded successfully.',
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your image. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleRemoveImage = () => {
    setImageUrl('')
    onChange('')
  }
  
  // Handle media selection from MediaLibrary
  const handleMediaSelect = (media: any) => {
    // Make sure the URL is absolute with the correct backend domain
    const baseApiUrl = getApiUrl().replace('/api', '')
    let fullUrl = media.url
    if (media.url.startsWith('/')) {
      fullUrl = `${baseApiUrl}${media.url}`
    }
    
    setImageUrl(fullUrl)
    onChange(fullUrl)
  }
  
  // Allow user to input a direct URL
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    onChange(e.target.value)
  }
  
  // Helper function to get display URL (proxied for backend images)
  const getDisplayUrl = (url: string) => {
    if (!url) return url
    return getProxiedImageUrl(url) || url
  }
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {imageUrl ? (
        <Card className="relative overflow-hidden">
          <Button 
            variant="destructive" 
            size="icon" 
            className="absolute top-2 right-2 z-10 h-8 w-8"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="aspect-video relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getDisplayUrl(imageUrl)} 
              alt="Uploaded image"
              className="w-full h-full object-cover" 
            />
          </div>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Drag and drop or click to upload</p>
              <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (max. 5MB)</p>
            </div>
            <div className="grid w-full gap-2">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              
              <div className="relative mt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <MediaLibrary
                onSelect={handleMediaSelect}
                allowedTypes={['image/*']}
                triggerButton={
                  <Button variant="outline" className="w-full">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Select from Media Library
                  </Button>
                }
              />
              
              {forBlog && (
                <div className="my-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox 
                      id="optimize-image" 
                      checked={optimizeImage} 
                      onCheckedChange={(checked) => setOptimizeImage(!!checked)}
                    />
                    <Label htmlFor="optimize-image" className="cursor-pointer text-sm">
                      Optimize for blog
                    </Label>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm">Image Optimization Settings</h4>
                          <div className="space-y-2">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="format" className="col-span-1">Format</Label>
                              <Select 
                                value={format} 
                                onValueChange={(val) => setFormat(val as any)}
                                disabled={!optimizeImage}
                              >
                                <SelectTrigger id="format" className="col-span-3">
                                  <SelectValue placeholder="Format" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="webp">WebP (recommended)</SelectItem>
                                  <SelectItem value="jpeg">JPEG</SelectItem>
                                  <SelectItem value="png">PNG</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor="quality">Quality: {quality}%</Label>
                              </div>
                              <Slider
                                id="quality"
                                min={30}
                                max={100}
                                step={5}
                                value={[quality]}
                                onValueChange={(values) => setQuality(values[0])}
                                disabled={!optimizeImage}
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="featured-image" 
                                checked={isFeaturedImage} 
                                onCheckedChange={(checked) => setIsFeaturedImage(!!checked)}
                                disabled={!optimizeImage}
                              />
                              <Label htmlFor="featured-image" className="text-sm">
                                Optimize as featured image (1200×630)
                              </Label>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {optimizeImage && (
                    <div className="text-xs text-muted-foreground">
                      {isFeaturedImage 
                        ? 'Will be optimized to 1200×630px for social sharing'
                        : 'Will be optimized to max 800px width, preserving aspect ratio'}
                    </div>
                  )}
                </div>
              )}
              
              <div className="relative mt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste URL</span>
                </div>
              </div>
              
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={handleUrlChange}
                disabled={isUploading}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 