import React, { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import exifr from 'exifr'



interface ImageMetadata {
  // Basic file information
  fileName: string
  fileSize: number
  fileSizeFormatted: string
  format: string
  mimeType: string
  
  // Image dimensions and properties
  width: number
  height: number
  aspectRatio: string
  megapixels: string
  pixelDensity?: number
  
  // Technical information
  colorSpace?: string
  bitDepth?: number
  hasTransparency: boolean
  isAnimated?: boolean
  frameCount?: number
  
  // EXIF data
  exif?: {
    camera?: string
    lens?: string
    focalLength?: string
    aperture?: string
    shutterSpeed?: string
    iso?: string
    flash?: string
    dateTime?: string
    gps?: {
      latitude: number
      longitude: number
      altitude?: number
    }
    orientation?: number
    colorSpace?: string
    whiteBalance?: string
    exposureMode?: string
    meteringMode?: string
    sceneCaptureType?: string
    contrast?: string
    saturation?: string
    sharpness?: string
    digitalZoomRatio?: string
    subjectDistance?: string
    lightSource?: string
    artist?: string
    copyright?: string
    software?: string
    imageDescription?: string
    userComment?: string
  }
  
  // Content analysis
  contentAnalysis: {
    isPhotographic: boolean
    hasTransparency: boolean
    dominantColors: string[]
    brightness: number
    contrast: number
    sharpness: number
    compressionPotential: {
      jpeg: number
      webp: number
      avif: number
    }
  }
}

export function useEnhancedMetadata() {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Calculate aspect ratio
  const calculateAspectRatio = (width: number, height: number): string => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    const divisor = gcd(width, height)
    const ratioW = width / divisor
    const ratioH = height / divisor
    
    // Common aspect ratios
    const commonRatios: Record<string, string> = {
      '16:9': '16:9 (Widescreen)',
      '4:3': '4:3 (Standard)',
      '3:2': '3:2 (DSLR)',
      '1:1': '1:1 (Square)',
      '21:9': '21:9 (Ultrawide)',
      '9:16': '9:16 (Portrait)',
      '2:3': '2:3 (Portrait)',
      '3:4': '3:4 (Portrait)'
    }
    
    const ratioKey = `${ratioW}:${ratioH}`
    return commonRatios[ratioKey] || `${ratioW}:${ratioH}`
  }
  
  // Extract EXIF data
  const extractExifData = async (file: File): Promise<any> => {
    try {
      // Use comprehensive EXIF extraction options
      const exifData = await exifr.parse(file, {
        // Enable all possible data segments
        tiff: true,
        exif: true,
        gps: true,
        icc: true,
        iptc: true,
        jfif: true,
        ihdr: true, // PNG chunks
        
        // Processing options
        sanitize: false,
        mergeOutput: true, // Changed to true for better data access
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
        
        // Include additional segments
        makerNote: true,
        userComment: true,
        
        // Ensure we get all available tags
        pick: undefined, // Don't filter any tags
        skip: undefined  // Don't skip any tags
      })

      if (!exifData || (typeof exifData === 'object' && Object.keys(exifData).length === 0)) {
        return {}
      }

      // Format the data for display
      const formattedExif: any = {}

      // Camera information - check multiple possible fields
      if (exifData.Make || exifData.Model || exifData.CameraMake || exifData.CameraModel) {
        const make = exifData.Make || exifData.CameraMake || '';
        const model = exifData.Model || exifData.CameraModel || '';
        formattedExif.camera = `${make} ${model}`.trim();
      }

      // Lens information - check multiple possible fields
      if (exifData.LensModel || exifData.LensMake || exifData.LensInfo || exifData.Lens) {
        const lensMake = exifData.LensMake || '';
        const lensModel = exifData.LensModel || exifData.Lens || '';
        formattedExif.lens = `${lensMake} ${lensModel}`.trim();
      }

      // Camera settings with better field checking
      if (exifData.FocalLength || exifData.FocalLengthIn35mmFormat) {
        const focal = exifData.FocalLength || exifData.FocalLengthIn35mmFormat;
        formattedExif.focalLength = `${focal}mm`;
      }

             if (exifData.FNumber || exifData.ApertureValue) {
         const aperture = exifData.FNumber || exifData.ApertureValue;
         // Handle aperture values that might be already formatted or need conversion
         const apertureStr = String(aperture);
         if (apertureStr.includes('f/')) {
           formattedExif.aperture = apertureStr;
         } else {
           formattedExif.aperture = `f/${aperture}`;
         }
       }

      if (exifData.ExposureTime || exifData.ShutterSpeedValue) {
        const exposure = exifData.ExposureTime || exifData.ShutterSpeedValue;
        formattedExif.shutterSpeed = exposure < 1 
          ? `1/${Math.round(1 / exposure)}s`
          : `${exposure}s`;
      }

      if (exifData.ISO || exifData.ISOSpeedRatings || exifData.PhotographicSensitivity) {
        const iso = exifData.ISO || exifData.ISOSpeedRatings || exifData.PhotographicSensitivity;
        formattedExif.iso = `ISO ${iso}`;
      }

      if (exifData.Flash !== undefined) {
        // Flash field is a bitmask, check if flash fired
        const flashFired = (exifData.Flash & 0x01) !== 0;
        formattedExif.flash = flashFired ? 'Flash Fired' : 'No Flash';
      }

      // Date and time - check multiple fields
      const dateFields = [
        exifData.DateTimeOriginal,
        exifData.DateTime, 
        exifData.CreateDate,
        exifData.DateTimeDigitized,
        exifData.ModifyDate
      ];
      
      const dateValue = dateFields.find(date => date);
      if (dateValue) {
        formattedExif.dateTime = dateValue instanceof Date 
          ? dateValue.toLocaleString() 
          : String(dateValue);
      }

             // GPS information - check multiple coordinate formats
       const lat = exifData.latitude || exifData.GPSLatitude;
       const lon = exifData.longitude || exifData.GPSLongitude;
       
       if (lat && lon && lat !== null && lon !== null && lat !== 0 && lon !== 0) {
         formattedExif.gps = {
           latitude: parseFloat(String(lat)),
           longitude: parseFloat(String(lon)),
           altitude: exifData.GPSAltitude ? parseFloat(String(exifData.GPSAltitude)) : undefined
         };
       }

      // Orientation
      if (exifData.Orientation) {
        formattedExif.orientation = exifData.Orientation;
      }

             // Additional technical data
       if (exifData.ColorSpace) {
         // Convert numeric color space values to readable names
         const colorSpace = exifData.ColorSpace;
         if (colorSpace === 1) {
           formattedExif.colorSpace = 'sRGB';
         } else if (colorSpace === 2) {
           formattedExif.colorSpace = 'Adobe RGB';
         } else if (colorSpace === 0xFFFF) {
           formattedExif.colorSpace = 'Uncalibrated';
         } else {
           formattedExif.colorSpace = String(colorSpace);
         }
       }

      if (exifData.WhiteBalance) {
        formattedExif.whiteBalance = exifData.WhiteBalance;
      }

      if (exifData.ExposureMode) {
        formattedExif.exposureMode = exifData.ExposureMode;
      }

      if (exifData.MeteringMode) {
        formattedExif.meteringMode = exifData.MeteringMode;
      }

      // Additional fields that are commonly available
      if (exifData.SceneCaptureType) {
        formattedExif.sceneCaptureType = exifData.SceneCaptureType;
      }

      if (exifData.Contrast) {
        formattedExif.contrast = exifData.Contrast;
      }

      if (exifData.Saturation) {
        formattedExif.saturation = exifData.Saturation;
      }

      if (exifData.Sharpness) {
        formattedExif.sharpness = exifData.Sharpness;
      }

             if (exifData.DigitalZoomRatio) {
         const ratio = parseFloat(String(exifData.DigitalZoomRatio));
         formattedExif.digitalZoomRatio = ratio === 1 ? 'None' : `${ratio}x`;
       }

      if (exifData.SubjectDistance) {
        formattedExif.subjectDistance = exifData.SubjectDistance;
      }

      if (exifData.LightSource) {
        formattedExif.lightSource = exifData.LightSource;
      }

      // Copyright and metadata
      if (exifData.Artist) {
        formattedExif.artist = exifData.Artist;
      }

      if (exifData.Copyright) {
        formattedExif.copyright = exifData.Copyright;
      }

      if (exifData.Software) {
        formattedExif.software = exifData.Software;
      }

      if (exifData.ImageDescription) {
        formattedExif.imageDescription = exifData.ImageDescription;
      }

      if (exifData.UserComment) {
        formattedExif.userComment = exifData.UserComment;
      }

             return formattedExif;
       
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
      return {};
    }
  }
  
  // Analyze image content
  const analyzeImageContent = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Check for transparency
    let hasTransparency = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasTransparency = true
        break
      }
    }
    
    // Analyze color distribution and properties
    let totalR = 0, totalG = 0, totalB = 0
    let brightness = 0
    let contrast = 0
    const colorMap = new Map<string, number>()
    
    const sampleSize = Math.min(10000, data.length / 4)
    const step = Math.floor(data.length / (sampleSize * 4))
    
    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      totalR += r
      totalG += g
      totalB += b
      
      // Calculate brightness (perceived luminance)
      const pixelBrightness = (0.299 * r + 0.587 * g + 0.114 * b)
      brightness += pixelBrightness
      
      // Track dominant colors (simplified)
      const colorKey = `${Math.floor(r/32)*32},${Math.floor(g/32)*32},${Math.floor(b/32)*32}`
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
    }
    
    const pixelCount = sampleSize
    brightness = brightness / pixelCount
    
    // Get dominant colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => `rgb(${color})`)
    
    // Determine if photographic (using color variance)
    let colorVariance = 0
    const avgR = totalR / pixelCount
    const avgG = totalG / pixelCount
    const avgB = totalB / pixelCount
    
    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      colorVariance += Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
    }
    
    colorVariance = Math.sqrt(colorVariance / pixelCount)
    const isPhotographic = colorVariance > 30
    
    // Estimate compression potential (simplified heuristic)
    const compressionPotential = {
      jpeg: isPhotographic ? 70 : 50, // Photos compress better with JPEG
      webp: isPhotographic ? 85 : 80, // WebP generally good for both
      avif: isPhotographic ? 90 : 85  // AVIF best for photos
    }
    
    return {
      isPhotographic,
      hasTransparency,
      dominantColors: sortedColors,
      brightness: Math.round(brightness),
      contrast: Math.round(colorVariance),
      sharpness: Math.round(colorVariance * 0.5), // Simplified sharpness estimate
      compressionPotential
    }
  }
  
  // Main analysis function
  const analyzeImage = useCallback(async (file: File): Promise<ImageMetadata> => {
    setIsAnalyzing(true)
    
    try {
      // Extract EXIF data FIRST from the original file (before any processing)
      const exifData = await extractExifData(file)
      
      // Then process the image for visual analysis
      return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        img.onload = async () => {
          try {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            
            // Analyze content
            const contentAnalysis = ctx ? analyzeImageContent(canvas, ctx) : {
              isPhotographic: true,
              hasTransparency: false,
              dominantColors: [],
              brightness: 0,
              contrast: 0,
              sharpness: 0,
              compressionPotential: { jpeg: 0, webp: 0, avif: 0 }
            }
            
            const metadata: ImageMetadata = {
              fileName: file.name,
              fileSize: file.size,
              fileSizeFormatted: formatFileSize(file.size),
              format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
              mimeType: file.type,
              width: img.width,
              height: img.height,
              aspectRatio: calculateAspectRatio(img.width, img.height),
              megapixels: ((img.width * img.height) / 1000000).toFixed(1),
              hasTransparency: contentAnalysis.hasTransparency,
              exif: exifData, // Use the EXIF data extracted from original file
              contentAnalysis
            }
            
            setMetadata(metadata)
            setIsAnalyzing(false)
            resolve(metadata)
          } catch (error) {
            setIsAnalyzing(false)
            reject(error)
          }
        }
        
        img.onerror = () => {
          setIsAnalyzing(false)
          reject(new Error('Failed to load image'))
        }
        
        img.src = URL.createObjectURL(file)
      })
    } catch (error) {
      setIsAnalyzing(false)
      throw error
    }
  }, [])
  
  // Render metadata display
  const renderMetadataDisplay = (imageMetadata?: ImageMetadata) => {
    const data = imageMetadata || metadata
    
    if (!data) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {isAnalyzing ? (
              <div className="space-y-2">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p>Analyzing image metadata...</p>
              </div>
            ) : (
              <p>Select an image to view detailed metadata</p>
            )}
          </CardContent>
        </Card>
      )
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Enhanced Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">File Name:</span>
                  <p className="font-medium truncate" title={data.fileName}>{data.fileName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">File Size:</span>
                  <p className="font-medium">{data.fileSizeFormatted}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Format:</span>
                  <Badge variant="outline" className="ml-1">{data.format}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Dimensions:</span>
                  <p className="font-medium">{data.width} × {data.height}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Aspect Ratio:</span>
                  <p className="font-medium">{data.aspectRatio}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Megapixels:</span>
                  <p className="font-medium">{data.megapixels} MP</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="technical" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">MIME Type:</span>
                  <p className="font-mono text-xs">{data.mimeType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transparency:</span>
                  <Badge variant={data.hasTransparency ? "default" : "secondary"}>
                    {data.hasTransparency ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Content Type:</span>
                  <Badge variant="outline">
                    {data.contentAnalysis.isPhotographic ? "Photographic" : "Graphic"}  
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Pixel Density:</span>
                  <p className="font-medium">{Math.round((data.width * data.height) / 1000)}K pixels</p>
                </div>
              </div>
              
              {data.exif && Object.keys(data.exif).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">EXIF Data</h4>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    {data.exif.camera && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Camera:</span>
                        <span className="font-medium text-right">{data.exif.camera}</span>
                      </div>
                    )}
                    {data.exif.lens && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lens:</span>
                        <span className="font-medium text-right">{data.exif.lens}</span>
                      </div>
                    )}
                    {data.exif.focalLength && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Focal Length:</span>
                        <span className="font-medium">{data.exif.focalLength}</span>
                      </div>
                    )}
                    {data.exif.aperture && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aperture:</span>
                        <span className="font-medium">{data.exif.aperture}</span>
                      </div>
                    )}
                    {data.exif.shutterSpeed && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shutter Speed:</span>
                        <span className="font-medium">{data.exif.shutterSpeed}</span>
                      </div>
                    )}
                    {data.exif.iso && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ISO:</span>
                        <span className="font-medium">{data.exif.iso}</span>
                      </div>
                    )}
                    {data.exif.flash && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flash:</span>
                        <span className="font-medium">{data.exif.flash}</span>
                      </div>
                    )}
                    {data.exif.dateTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date Taken:</span>
                        <span className="font-medium text-right">{data.exif.dateTime}</span>
                      </div>
                    )}
                    {data.exif.gps && (
                      <div className="border-t pt-2">
                        <p className="text-muted-foreground mb-1">GPS Location:</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Latitude:</span>
                            <span className="font-medium">{data.exif.gps.latitude.toFixed(6)}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Longitude:</span>
                            <span className="font-medium">{data.exif.gps.longitude.toFixed(6)}°</span>
                          </div>
                          {data.exif.gps.altitude && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Altitude:</span>
                              <span className="font-medium">{data.exif.gps.altitude.toFixed(1)}m</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {data.exif.colorSpace && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Color Space:</span>
                        <span className="font-medium">{data.exif.colorSpace}</span>
                      </div>
                    )}
                    {data.exif.whiteBalance && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">White Balance:</span>
                        <span className="font-medium">{data.exif.whiteBalance}</span>
                      </div>
                    )}
                    {data.exif.exposureMode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exposure Mode:</span>
                        <span className="font-medium">{data.exif.exposureMode}</span>
                      </div>
                    )}
                    {data.exif.meteringMode && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Metering Mode:</span>
                        <span className="font-medium">{data.exif.meteringMode}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Brightness</span>
                    <span>{data.contentAnalysis.brightness}/255</span>
                  </div>
                  <Progress value={(data.contentAnalysis.brightness / 255) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Contrast</span>
                    <span>{data.contentAnalysis.contrast}/100</span>
                  </div>
                  <Progress value={Math.min(data.contentAnalysis.contrast, 100)} className="h-2" />
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 text-sm">Compression Potential</h4>
                  <div className="space-y-2">
                    {Object.entries(data.contentAnalysis.compressionPotential).map(([format, potential]) => (
                      <div key={format} className="flex items-center justify-between">
                        <span className="text-sm uppercase font-medium">{format}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={potential} className="h-2 w-20" />
                          <span className="text-xs w-8">{potential}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {data.contentAnalysis.dominantColors.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2 text-sm">Dominant Colors</h4>
                    <div className="flex gap-2">
                      {data.contentAnalysis.dominantColors.slice(0, 5).map((color, index) => (
                        <div
                          key={index}
                          className="w-8 h-8 rounded border border-border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    )
  }
  
  return {
    metadata,
    isAnalyzing,
    analyzeImage,
    renderMetadataDisplay,
    formatFileSize
  }
} 