'use client'

import React, { useState, useEffect } from 'react'
import { Upload, Download, RotateCcw, Info, Camera, Palette, BarChart3, X, Copy, MapPin, Calendar, Settings, Image as ImageIcon, Zap, Eye, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import { ToolHeader } from '@/components/tools/ToolHeader'
import ImageDropzone from '@/components/tools/ImageDropzone'
import { useEnhancedMetadata, ThemedButton, toolThemes, type ToolTheme } from '../shared'

// Enhanced ImagePreview component
interface ImagePreviewProps {
  file: File
  preview: string | null
  metadata?: any
  onRemove: () => void
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file, preview, metadata, onRemove }) => {
  return (
    <div className="relative group">
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl overflow-hidden flex items-center justify-center shadow-sm border">
        {preview ? (
          <img 
            src={preview} 
            alt={file.name}
            className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
            onError={() => {
              // Fallback for formats that might fail to load
              console.log(`Failed to load preview for ${file.name}`);
            }}
          />
        ) : (
          // Fallback placeholder for files that couldn't be converted
          <div className="text-center p-6 space-y-3">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Image Preview</p>
              <p className="text-xs text-muted-foreground">{file.name}</p>
              <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                Preview not available
              </div>
            </div>
          </div>
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
      {metadata && (
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs">
          {metadata.width} × {metadata.height}
        </div>
      )}
    </div>
  )
}

// Color palette component
const ColorPalette: React.FC<{ colors: string[], title?: string }> = ({ colors, title = "Dominant Colors" }) => {
  const { toast } = useToast()
  
  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    toast({
      title: "Color copied",
      description: `${color} copied to clipboard`,
    })
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold flex items-center gap-2">
        <Palette className="h-4 w-4" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, index) => (
          <div
            key={index}
            className="group cursor-pointer transition-transform hover:scale-110"
            onClick={() => copyColor(color)}
            title={`Click to copy ${color}`}
          >
            <div
              className="w-8 h-8 rounded-lg border-2 border-white shadow-md"
              style={{ backgroundColor: color }}
            />
            <p className="text-xs text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {color.replace('rgb(', '').replace(')', '')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

const FaceColorPalette: React.FC<{ faceAnalysis: any }> = ({ faceAnalysis }) => {
  const { toast } = useToast()

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    toast({
      title: "Color copied",
      description: `${color} copied to clipboard`,
    })
  }

  if (!faceAnalysis) {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Advanced Color Analysis
        </h4>
        <div className="text-center py-8 text-muted-foreground">
          <Palette className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No advanced color analysis available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h4 className="font-semibold flex items-center gap-2">
        <Palette className="h-4 w-4" />
        Advanced Color Analysis
        {faceAnalysis.faceCount > 0 && (
          <Badge variant="outline" className="ml-2">
            {faceAnalysis.faceCount} face{faceAnalysis.faceCount > 1 ? 's' : ''}
          </Badge>
        )}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Face & Skin Tones */}
        {faceAnalysis.faceCount > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Face & Skin Tones
            </h5>
            
            {faceAnalysis.averageSkinTone && (
              <div className="space-y-2">
                <p className="text-sm">Average Skin Tone</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: faceAnalysis.averageSkinTone }}
                    onClick={() => copyColor(faceAnalysis.averageSkinTone)}
                    title={`Click to copy ${faceAnalysis.averageSkinTone}`}
                  />
                  <span className="text-xs text-muted-foreground">{faceAnalysis.averageSkinTone}</span>
                </div>
              </div>
            )}

            {faceAnalysis.skinToneVariety && faceAnalysis.skinToneVariety.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm">Skin Tone Variety</p>
                <div className="flex flex-wrap gap-2">
                  {faceAnalysis.skinToneVariety.map((color: string, index: number) => (
                    <div
                      key={index}
                      className="w-6 h-6 rounded-lg border border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      onClick={() => copyColor(color)}
                      title={`Click to copy ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clothing Colors */}
        {faceAnalysis.clothingColors && faceAnalysis.clothingColors.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Clothing Colors
            </h5>
            
            {faceAnalysis.dominantClothingColor && (
              <div className="space-y-2">
                <p className="text-sm">Dominant Color</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: faceAnalysis.dominantClothingColor }}
                    onClick={() => copyColor(faceAnalysis.dominantClothingColor)}
                    title={`Click to copy ${faceAnalysis.dominantClothingColor}`}
                  />
                  <span className="text-xs text-muted-foreground">{faceAnalysis.dominantClothingColor}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm">Color Palette</p>
              <div className="flex flex-wrap gap-2">
                {faceAnalysis.clothingColors.map((color: string, index: number) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-lg border border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => copyColor(color)}
                    title={`Click to copy ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hair Colors */}
        {faceAnalysis.hairColors && faceAnalysis.hairColors.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Hair Colors
            </h5>
            
            {faceAnalysis.dominantHairColor && (
              <div className="space-y-2">
                <p className="text-sm">Dominant Color</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: faceAnalysis.dominantHairColor }}
                    onClick={() => copyColor(faceAnalysis.dominantHairColor)}
                    title={`Click to copy ${faceAnalysis.dominantHairColor}`}
                  />
                  <span className="text-xs text-muted-foreground">{faceAnalysis.dominantHairColor}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm">Hair Tones</p>
              <div className="flex flex-wrap gap-2">
                {faceAnalysis.hairColors.map((color: string, index: number) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-lg border border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => copyColor(color)}
                    title={`Click to copy ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Background Colors */}
        {faceAnalysis.backgroundColors && faceAnalysis.backgroundColors.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Background Colors
            </h5>
            
            {faceAnalysis.dominantBackgroundColor && (
              <div className="space-y-2">
                <p className="text-sm">Dominant Color</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: faceAnalysis.dominantBackgroundColor }}
                    onClick={() => copyColor(faceAnalysis.dominantBackgroundColor)}
                    title={`Click to copy ${faceAnalysis.dominantBackgroundColor}`}
                  />
                  <span className="text-xs text-muted-foreground">{faceAnalysis.dominantBackgroundColor}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm">Background Palette</p>
              <div className="flex flex-wrap gap-2">
                {faceAnalysis.backgroundColors.map((color: string, index: number) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-lg border border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    onClick={() => copyColor(color)}
                    title={`Click to copy ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Environmental Colors */}
      {faceAnalysis.environmentalColors && faceAnalysis.environmentalColors.length > 0 && (
        <div className="space-y-3">
          <h5 className="font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Environmental Colors
          </h5>
          <div className="flex flex-wrap gap-2">
            {faceAnalysis.environmentalColors.map((color: string, index: number) => (
              <div
                key={index}
                className="group cursor-pointer transition-transform hover:scale-110"
                onClick={() => copyColor(color)}
                title={`Click to copy ${color}`}
              >
                <div
                  className="w-8 h-8 rounded-lg border border-white shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <p className="text-xs text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {color.replace('rgb(', '').replace(')', '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Analysis: {faceAnalysis.analysisType === 'skin-tone-estimation' ? 'Intelligent color segmentation' : 'Face detection + color analysis'}
      </div>
    </div>
  )
}

// Quick stats component
const QuickStats: React.FC<{ metadata: any }> = ({ metadata }) => {
  const stats = [
    { label: "Resolution", value: `${metadata.width} × ${metadata.height}`, icon: ImageIcon },
    { label: "File Size", value: metadata.fileSizeFormatted, icon: BarChart3 },
    { label: "Format", value: metadata.format, icon: Layers },
    { label: "Megapixels", value: `${metadata.megapixels} MP`, icon: Eye },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
          <div className="p-2 bg-primary/10 rounded-md">
            <stat.icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-medium text-sm">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper function to parse structured camera comments (e.g., MediaTek)
const parseCameraComment = (comment: string) => {
  if (!comment || typeof comment !== 'string') return null;
  
  // Check if it looks like MediaTek structured data
  if (comment.includes(';') && comment.includes(':')) {
    const pairs = comment.split(';').map(pair => pair.trim()).filter(Boolean);
    const parsed: Record<string, string> = {};
    
    pairs.forEach(pair => {
      const [key, value] = pair.split(':').map(str => str.trim());
      if (key && value !== undefined) {
        parsed[key] = value;
      }
    });
    
    return Object.keys(parsed).length > 0 ? parsed : null;
  }
  
  return null;
}

// Component to display parsed camera comment
const CameraCommentDisplay: React.FC<{ comment: string }> = ({ comment }) => {
  const parsedData = parseCameraComment(comment);
  
  if (!parsedData) {
    return <p className="font-medium text-sm leading-relaxed">{comment}</p>;
  }
  
  // Group parameters by category
  const categories = {
    'Camera Settings': ['filter', 'filterIntensity', 'filterMask', 'captureOrientation', 'sceneMode', 'module'],
    'Processing': ['algolist', 'multi-frame', 'hw-remosaic', 'brp_mask', 'brp_del_th', 'brp_del_sen'],
    'Scene Analysis': ['AI_Scene', 'aec_lux', 'aec_lux_index', 'cct_value', 'motionLevel'],
    'Environment': ['weatherinfo', 'temperature', 'touch', 'albedo', 'confidence', 'delta']
  };
  
  return (
    <div className="space-y-4">
      {Object.entries(categories).map(([category, keys]) => {
        const categoryData = keys.reduce((acc, key) => {
          if (parsedData[key] !== undefined) {
            acc[key] = parsedData[key];
          }
          return acc;
        }, {} as Record<string, string>);
        
        if (Object.keys(categoryData).length === 0) return null;
        
        return (
          <div key={category} className="space-y-2">
            <h5 className="font-medium text-sm text-muted-foreground">{category}</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(categoryData).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-medium">{value === 'null' ? 'N/A' : value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      
      {/* Show any remaining parameters */}
      {(() => {
        const allCategoryKeys = Object.values(categories).flat();
        const remaining = Object.entries(parsedData).filter(([key]) => !allCategoryKeys.includes(key));
        
        if (remaining.length === 0) return null;
        
        return (
          <div className="space-y-2">
            <h5 className="font-medium text-sm text-muted-foreground">Other Parameters</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {remaining.map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="font-medium">{value === 'null' ? 'N/A' : value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function MetadataAnalysisTool() {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<(string | null)[]>([])
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const [shouldClearDropzone, setShouldClearDropzone] = useState(false)
  const [metadata, setMetadata] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isConvertingPreviews, setIsConvertingPreviews] = useState(false)
  
  const { toast } = useToast()
  
  // Get the metadata tool theme
  const toolTheme = toolThemes.metadata
  
  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to convert HEIC to JPEG for preview
  const convertHeicToPreview = async (file: File): Promise<string> => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('HEIC conversion only available in browser');
      }

      // Dynamic import to avoid SSR issues
      const heic2any = (await import('heic2any')).default;
      
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      }) as Blob;
      
      return URL.createObjectURL(convertedBlob);
    } catch (error) {
      console.warn('Failed to convert HEIC to JPEG:', error);
      throw error;
    }
  };

  // Check if file is HEIC format
  const isHeicFile = (file: File): boolean => {
    return file.type === 'image/heic' || file.type === 'image/heif' || 
           file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  };

  // Handle image drop
  const handleImageDrop = (droppedFiles: File[]) => {
    const supportedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/heic',
      'image/heif',
      'image/tiff',
      'image/tif',
      'image/bmp',
      'image/x-bmp',
      'image/x-ms-bmp',
      'image/vnd.microsoft.icon',
      'image/x-icon',
      'image/icon',
      'image/ico',
      'image/avif',
      'image/jxl',
      'image/jp2',
      'image/jpx',
      'image/jpm',
      'image/mj2',
      // Common RAW camera formats - metadata extraction only
      'image/x-canon-cr2',
      'image/x-canon-cr3',
      'image/x-canon-crw',
      'image/x-nikon-nef',
      'image/x-sony-arw',
      'image/x-adobe-dng',
      'image/x-panasonic-raw',
      'image/x-olympus-orf',
      'image/x-fuji-raf',
      'image/x-pentax-pef',
      'image/x-samsung-srw',
      'image/x-sigma-x3f'
    ]
    
    const imageFiles = droppedFiles.filter(file => 
      supportedTypes.includes(file.type)
    )
    
    // Check for unsupported files
    const unsupportedFiles = droppedFiles.filter(file => 
      !supportedTypes.includes(file.type)
    )
    
    if (unsupportedFiles.length > 0) {
      const unsupportedNames = unsupportedFiles.map(f => f.name).join(', ')
      const isRawFormat = unsupportedFiles.some(f => 
        f.name.toLowerCase().match(/\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw|x3f)$/i) ||
        f.type.includes('raw') || f.type.includes('x-')
      )
      
      toast({
        title: "Unsupported files",
        description: isRawFormat 
          ? `RAW camera formats (${unsupportedNames}) are not supported. Please convert to JPEG/PNG first.`
          : `${unsupportedFiles.length} file(s) skipped (${unsupportedNames}). Supported: JPEG, PNG, WebP, TIFF, BMP, HEIC, AVIF, etc.`,
        variant: "destructive"
      })
    }
    
    if (imageFiles.length === 0) {
      toast({
        title: "No valid images",
        description: "Please upload supported image files. RAW camera formats (CR2, NEF, ARW, etc.) are not supported.",
        variant: "destructive"
      })
      return
    }

    // Clear existing files and previews
    files.forEach((_, index) => {
      if (previews[index] && previews[index] !== '') {
        URL.revokeObjectURL(previews[index])
      }
    })

    setFiles(imageFiles)
    setSelectedFileIndex(0)

    // Create new previews
    const createPreviews = async () => {
      setIsConvertingPreviews(true);
      const newPreviews: (string | null)[] = [];
      const heicFiles = imageFiles.filter(isHeicFile);
      
      if (heicFiles.length > 0) {
        toast({
          title: "Processing HEIC files",
          description: `Converting ${heicFiles.length} HEIC file${heicFiles.length > 1 ? 's' : ''} for preview...`,
        });
      }
      
      for (const file of imageFiles) {
        try {
          if (isHeicFile(file)) {
            // Convert HEIC to JPEG for preview
            const previewUrl = await convertHeicToPreview(file);
            newPreviews.push(previewUrl);
          } else {
            // Create normal blob URL for other formats
            newPreviews.push(URL.createObjectURL(file));
          }
        } catch (error) {
          console.warn(`Failed to create preview for ${file.name}:`, error);
          newPreviews.push(null); // Fallback to null if conversion fails
        }
      }
      
      setPreviews(newPreviews);
      setIsConvertingPreviews(false);
      
      // Updated success message
      const convertedCount = heicFiles.length;
      const successMessage = convertedCount > 0 
        ? `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} loaded (${convertedCount} HEIC converted)`
        : `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} ready for analysis`;
        
      toast({
        title: "Images loaded",
        description: successMessage,
      });
    };
    
    createPreviews();
  }

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    if (previews[index] && previews[index] !== '') {
      URL.revokeObjectURL(previews[index])
    }

    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)

    setFiles(newFiles)
    setPreviews(newPreviews)

    // Clear metadata when removing files
    setMetadata(null)

    // Adjust selected index
    if (selectedFileIndex === index) {
      setSelectedFileIndex(newFiles.length > 0 ? Math.max(0, index - 1) : null)
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1)
    }
  }

  // Handle remove all files
  const handleRemoveAllFiles = () => {
    previews.forEach(preview => {
      if (preview && preview !== '') {
        URL.revokeObjectURL(preview)
      }
    })
    setFiles([])
    setPreviews([])
    setSelectedFileIndex(null)
    setMetadata(null)
    setShouldClearDropzone(true)
  }

  // Handle dropzone clear complete
  const handleDropzoneClearComplete = () => {
    setShouldClearDropzone(false)
  }

  // Use the enhanced metadata hook for client-side analysis
  const { analyzeImage: analyzeImageMetadata, isAnalyzing: isAnalyzingMetadata } = useEnhancedMetadata()
  
  // Analyze image with client-side processing
  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true)
    setMetadata(null)
    
    try {
      const result = await analyzeImageMetadata(file)
      setMetadata(result)
      
      // Show appropriate message based on file type
      const isHEIC = file.type === 'image/heic' || file.type === 'image/heif'
      
      toast({
        title: "Analysis complete",
        description: isHEIC 
          ? "Metadata extracted successfully. Note: HEIC files have limited color analysis capabilities."
          : "Comprehensive metadata extracted successfully",
      })
    } catch (error: any) {
      console.error('Metadata analysis failed:', error)
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze image metadata",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Analyze selected image
  useEffect(() => {
    if (selectedFileIndex !== null && files[selectedFileIndex]) {
      analyzeImage(files[selectedFileIndex])
    }
  }, [selectedFileIndex, files])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview && preview !== '') {
          URL.revokeObjectURL(preview)
        }
      })
    }
  }, [])

  // Export metadata as JSON
  const handleExportMetadata = () => {
    if (!metadata) {
      toast({
        title: "No metadata",
        description: "Please analyze an image first",
        variant: "destructive"
      })
      return
    }

    const dataStr = JSON.stringify(metadata, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const fileName = metadata.fileName || (selectedFileIndex !== null ? files[selectedFileIndex]?.name : undefined) || 'unknown'
    const baseName = fileName.replace(/\.[^/.]+$/, "")
    const link = document.createElement('a')
    link.href = url
    link.download = `${baseName}_metadata.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Metadata exported",
      description: "Complete metadata exported as JSON file",
    })
  }

  // Copy metadata to clipboard
  const handleCopyMetadata = () => {
    if (!metadata) return
    
    const formattedData = JSON.stringify(metadata, null, 2)
    navigator.clipboard.writeText(formattedData)
    toast({
      title: "Copied to clipboard",
      description: "Metadata copied as formatted JSON",
    })
  }

  return (
    <div className="min-h-screen">
      <ToolHeader
        title="Image Metadata Analyzer"
        description="Extract comprehensive EXIF data, analyze image properties, and get detailed insights about your images with professional-grade analysis tools."
        icon={<Info className="h-6 w-6" />}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left: Upload & Controls */}
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Images
                </CardTitle>
                <CardDescription>
                  Upload images to analyze their metadata and properties. Supports JPEG, PNG, WebP, TIFF, BMP, HEIC, and more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageDropzone
                  onImageDrop={handleImageDrop}
                  existingFiles={files.length}
                  shouldClear={shouldClearDropzone}
                  onClearComplete={handleDropzoneClearComplete}
                />
                
                {/* Note: No rate limiting needed for client-side analysis */}
              </CardContent>
            </Card>

            {/* File List */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Images ({files.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                          selectedFileIndex === index 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-accent/50 border border-transparent'
                        }`}
                        onClick={() => setSelectedFileIndex(index)}
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="h-10 w-10 mr-3 flex-shrink-0 bg-background rounded-lg overflow-hidden border">
                            {previews[index] ? (
                              <img 
                                src={previews[index]!} 
                                alt={file.name} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFile(index)
                          }}
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ThemedButton 
                    toolTheme={toolTheme}
                    onClick={handleExportMetadata}
                    disabled={!metadata}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export as JSON
                  </ThemedButton>
                  
                  <ThemedButton 
                    toolTheme={toolTheme}
                    onClick={handleCopyMetadata}
                    disabled={!metadata}
                    className="w-full"
                    variant="outline"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </ThemedButton>
                  
                  <ThemedButton 
                    toolTheme={toolTheme}
                    onClick={handleRemoveAllFiles}
                    variant="outline" 
                    className="w-full"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Clear All
                  </ThemedButton>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center: Image Preview */}
          <div className="xl:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Preview
                  {isConvertingPreviews && (
                    <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      Converting HEIC...
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFileIndex !== null && files[selectedFileIndex] ? (
                  <div className="space-y-4">
                    <ImagePreview
                      file={files[selectedFileIndex]}
                      preview={previews[selectedFileIndex]}
                      metadata={metadata}
                      onRemove={() => handleRemoveFile(selectedFileIndex)}
                    />
                    
                    {/* Quick Stats */}
                    {metadata && <QuickStats metadata={metadata} />}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No Image Selected</p>
                    <p className="text-sm">Upload an image to see preview and analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Metadata Analysis */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Analysis Results
                  {isAnalyzing && (
                    <div className="ml-auto">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  Comprehensive metadata extraction and image analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metadata ? (
                  <Tabs defaultValue="properties" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="properties">Properties</TabsTrigger>
                      <TabsTrigger value="camera">Camera</TabsTrigger>
                      <TabsTrigger value="analysis">Analysis</TabsTrigger>
                      <TabsTrigger value="optimization">Optimization</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="properties" className="space-y-6 mt-6">
                      {/* Basic Properties */}
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Basic Properties
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="text-muted-foreground">File Name</span>
                            <p className="font-medium break-all">{metadata.fileName}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">File Size</span>
                            <p className="font-medium">{metadata.fileSizeFormatted}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Format</span>
                            <Badge variant="outline">{metadata.format}</Badge>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">MIME Type</span>
                            <p className="font-mono text-xs">{metadata.mimeType}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Dimensions</span>
                            <p className="font-medium">{metadata.width} × {metadata.height}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Aspect Ratio</span>
                            <p className="font-medium">{metadata.aspectRatio}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Megapixels</span>
                            <p className="font-medium">{metadata.megapixels} MP</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Color Space</span>
                            <p className="font-medium">{metadata.colorSpace || 'Unknown'}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Technical Details */}
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Technical Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Bit Depth</span>
                            <p className="font-medium">{metadata.bitDepth ? `${metadata.bitDepth} bits` : 'Unknown'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Transparency</span>
                            <Badge variant={metadata.hasTransparency ? "default" : "secondary"}>
                              {metadata.hasTransparency ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Animated</span>
                            <Badge variant={metadata.isAnimated ? "default" : "secondary"}>
                              {metadata.isAnimated ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Frames</span>
                            <p className="font-medium">{metadata.frameCount || 1}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Density</span>
                            <p className="font-medium">{metadata.density ? `${metadata.density} DPI` : 'Unknown'}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Content Type</span>
                            <Badge variant="outline">
                              {metadata.contentAnalysis?.isPhotographic ? "Photographic" : "Graphic"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="camera" className="space-y-6 mt-6">
                      {metadata.exif && Object.keys(metadata.exif).length > 0 ? (
                        <>
                          {/* Camera Information */}
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Camera className="h-4 w-4" />
                              Camera Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {metadata.exif.camera && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Camera</span>
                                  <p className="font-medium">{metadata.exif.camera}</p>
                                </div>
                              )}
                              {metadata.exif.lens && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Lens</span>
                                  <p className="font-medium">{metadata.exif.lens}</p>
                                </div>
                              )}
                              {metadata.exif.dateTime && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Date Taken</span>
                                  <p className="font-medium">{metadata.exif.dateTime}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Camera Settings */}
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Camera Settings
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {metadata.exif.focalLength && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Focal Length</span>
                                  <p className="font-medium">{metadata.exif.focalLength}</p>
                                </div>
                              )}
                              {metadata.exif.aperture && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Aperture</span>
                                  <p className="font-medium">{metadata.exif.aperture}</p>
                                </div>
                              )}
                              {metadata.exif.shutterSpeed && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Shutter Speed</span>
                                  <p className="font-medium">{metadata.exif.shutterSpeed}</p>
                                </div>
                              )}
                              {metadata.exif.iso && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">ISO</span>
                                  <p className="font-medium">{metadata.exif.iso}</p>
                                </div>
                              )}
                              {metadata.exif.flash && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Flash</span>
                                  <p className="font-medium">{metadata.exif.flash}</p>
                                </div>
                              )}
                              {metadata.exif.whiteBalance && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">White Balance</span>
                                  <p className="font-medium">{metadata.exif.whiteBalance}</p>
                                </div>
                              )}
                              {metadata.exif.digitalZoomRatio && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Digital Zoom</span>
                                  <p className="font-medium">{metadata.exif.digitalZoomRatio}x</p>
                                </div>
                              )}
                              {metadata.exif.subjectDistance && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Subject Distance</span>
                                  <p className="font-medium">{metadata.exif.subjectDistance}</p>
                                </div>
                              )}
                              {metadata.exif.lightSource && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Light Source</span>
                                  <p className="font-medium">{metadata.exif.lightSource}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {metadata.exif.gps && (
                            <>
                              <Separator />
                              {/* GPS Information */}
                              <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  GPS Location
                                </h3>
                                <div className="grid grid-cols-1 gap-4 text-sm">
                                  <div className="space-y-1">
                                    <span className="text-muted-foreground">Coordinates</span>
                                    <p className="font-mono text-xs">
                                      {metadata.exif.gps.latitude.toFixed(6)}°, {metadata.exif.gps.longitude.toFixed(6)}°
                                    </p>
                                  </div>
                                  {metadata.exif.gps.altitude && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Altitude</span>
                                      <p className="font-medium">{metadata.exif.gps.altitude.toFixed(1)} meters</p>
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <span className="text-muted-foreground">Open in Maps</span>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                      >
                                        <a
                                          href={`https://www.google.com/maps/@${metadata.exif.gps.latitude},${metadata.exif.gps.longitude},15z`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs"
                                        >
                                          Google Maps
                                        </a>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${metadata.exif.gps.latitude}, ${metadata.exif.gps.longitude}`);
                                          toast({ title: "Coordinates copied", description: "GPS coordinates copied to clipboard" });
                                        }}
                                        className="text-xs"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Copyright & Metadata Section */}
                          {(metadata.exif.artist || metadata.exif.copyright || metadata.exif.software || metadata.exif.userComment || metadata.exif.imageDescription) && (
                            <>
                              <Separator />
                              <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  Copyright & Metadata
                                </h3>
                                <div className="grid grid-cols-1 gap-4 text-sm">
                                  {metadata.exif.artist && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Artist/Creator</span>
                                      <p className="font-medium">{metadata.exif.artist}</p>
                                    </div>
                                  )}
                                  {metadata.exif.copyright && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Copyright</span>
                                      <p className="font-medium">{metadata.exif.copyright}</p>
                                    </div>
                                  )}
                                  {metadata.exif.software && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Software</span>
                                      <p className="font-medium">{metadata.exif.software}</p>
                                    </div>
                                  )}
                                  {metadata.exif.imageDescription && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Description</span>
                                      <p className="font-medium">{metadata.exif.imageDescription}</p>
                                    </div>
                                  )}
                                  {metadata.exif.userComment && (
                                    <div className="space-y-3">
                                      <span className="text-muted-foreground">User Comment</span>
                                      <CameraCommentDisplay comment={metadata.exif.userComment} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Additional Technical Details */}
                          {(metadata.exif.exposureMode || metadata.exif.meteringMode || metadata.exif.sceneCaptureType || metadata.exif.contrast || metadata.exif.saturation || metadata.exif.sharpness) && (
                            <>
                              <Separator />
                              <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  Advanced Settings
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {metadata.exif.exposureMode && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Exposure Mode</span>
                                      <p className="font-medium">{metadata.exif.exposureMode}</p>
                                    </div>
                                  )}
                                  {metadata.exif.meteringMode && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Metering Mode</span>
                                      <p className="font-medium">{metadata.exif.meteringMode}</p>
                                    </div>
                                  )}
                                  {metadata.exif.sceneCaptureType && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Scene Type</span>
                                      <p className="font-medium">{metadata.exif.sceneCaptureType}</p>
                                    </div>
                                  )}
                                  {metadata.exif.contrast && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Contrast</span>
                                      <p className="font-medium">{metadata.exif.contrast}</p>
                                    </div>
                                  )}
                                  {metadata.exif.saturation && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Saturation</span>
                                      <p className="font-medium">{metadata.exif.saturation}</p>
                                    </div>
                                  )}
                                  {metadata.exif.sharpness && (
                                    <div className="space-y-1">
                                      <span className="text-muted-foreground">Sharpness</span>
                                      <p className="font-medium">{metadata.exif.sharpness}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-16 text-muted-foreground">
                          <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">No Camera Data</p>
                          <div className="space-y-2 text-sm">
                            <p>This image doesn't contain EXIF camera information</p>
                            <div className="text-xs opacity-75">
                              <p>Common reasons:</p>
                              <ul className="list-disc list-inside space-y-1 mt-1">
                                <li>Screenshot or generated image</li>
                                <li>Edited/processed image with stripped metadata</li>
                                <li>Web image without camera info</li>
                                <li>Privacy settings removed EXIF data</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="analysis" className="space-y-6 mt-6">
                      {metadata.processingNotes && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <Info className="h-4 w-4 inline mr-2" />
                            {metadata.processingNotes}
                          </p>
                        </div>
                      )}
                      
                      {metadata.contentAnalysis && (
                        <>
                          {/* Quality Metrics */}
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Quality Metrics
                            </h3>
                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Brightness</span>
                                  <span className="font-medium">{metadata.contentAnalysis.brightness}/255</span>
                                </div>
                                <Progress value={(metadata.contentAnalysis.brightness / 255) * 100} className="h-3" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {metadata.contentAnalysis.brightness < 85 ? "Dark image" :
                                   metadata.contentAnalysis.brightness < 170 ? "Well balanced" : "Bright image"}
                                </p>
                              </div>
                              
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Contrast</span>
                                  <span className="font-medium">{metadata.contentAnalysis.contrast}</span>
                                </div>
                                <Progress value={Math.min(metadata.contentAnalysis.contrast, 100)} className="h-3" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {metadata.contentAnalysis.contrast < 30 ? "Low contrast" :
                                   metadata.contentAnalysis.contrast < 60 ? "Normal contrast" : "High contrast"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Color Analysis */}
                          {metadata.contentAnalysis.dominantColors && metadata.contentAnalysis.dominantColors.length > 0 && (
                            <div className="space-y-4">
                              <ColorPalette colors={metadata.contentAnalysis.dominantColors} />
                            </div>
                          )}

                          {/* Face Color Analysis */}
                          {metadata.faceAnalysis && (
                            <>
                              <Separator />
                              <FaceColorPalette faceAnalysis={metadata.faceAnalysis} />
                            </>
                          )}
                        </>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="optimization" className="space-y-6 mt-6">
                      {metadata.contentAnalysis?.compressionPotential && (
                        <>
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Compression Analysis
                            </h3>
                            <div className="space-y-4">
                              {Object.entries(metadata.contentAnalysis.compressionPotential).map(([format, potential]) => (
                                <div key={format} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                  <div className="space-y-1">
                                    <span className="font-medium uppercase text-sm">{format}</span>
                                    <p className="text-xs text-muted-foreground">
                                      {format === 'jpeg' && "Best for photos without transparency"}
                                      {format === 'webp' && "Modern format with excellent compression"}
                                      {format === 'avif' && "Next-gen format with superior compression"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Progress value={Number(potential)} className="h-2 w-20" />
                                    <span className="text-sm font-medium w-12 text-right">{Number(potential)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Performance Insights */}
                          <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Performance Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="p-3 border rounded-lg">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Pixel Density</span>
                                  <p className="font-medium">{Math.round((metadata.width * metadata.height) / 1000)}K pixels</p>
                                </div>
                              </div>
                              
                              <div className="p-3 border rounded-lg">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Bytes per Pixel</span>
                                  <p className="font-medium">{(metadata.fileSize / (metadata.width * metadata.height)).toFixed(2)}</p>
                                </div>
                              </div>
                              
                              <div className="p-3 border rounded-lg">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Compression Ratio</span>
                                  <p className="font-medium">{((metadata.width * metadata.height * 3) / metadata.fileSize).toFixed(1)}:1</p>
                                </div>
                              </div>
                              
                              <div className="p-3 border rounded-lg">
                                <div className="space-y-1">
                                  <span className="text-muted-foreground">Quality Category</span>
                                  <Badge variant="outline">
                                    {parseFloat(metadata.megapixels) < 1 ? "Low" : 
                                     parseFloat(metadata.megapixels) < 5 ? "Standard" :
                                     parseFloat(metadata.megapixels) < 12 ? "High" : "Ultra High"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div 
                      className="animate-spin h-8 w-8 border-2 border-t-transparent rounded-full mb-4"
                      style={{ 
                        borderColor: `${toolTheme.primaryColor}20`,
                        borderTopColor: toolTheme.primaryColor 
                      }}
                    ></div>
                    <p className={`text-lg font-medium ${toolTheme.progressText}`}>Analyzing Image</p>
                    <p className="text-sm">Extracting metadata and analyzing properties...</p>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Palette className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No Analysis Data</p>
                    <p className="text-sm">Upload and select an image to view comprehensive analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 