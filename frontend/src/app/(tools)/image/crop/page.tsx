'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ToolHeader } from '@/components/tools/ToolHeader'
import { Button } from '@/components/ui/button'
import { Crop, Download, X, Trash2, MoveHorizontal, MoveVertical, ArrowDownSquare, RefreshCw, CheckCircle, Server } from 'lucide-react'
import ImageDropzone from '@/components/tools/ImageDropzone'
import { useToast } from '@/components/ui/use-toast'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { processHeicFiles } from '@/lib/heicConverter'

import { getApiUrl } from '@/lib/apiClient'

import { useProcessingMode } from '@/lib/context/ProcessingModeContext'
import { QueueStatusIndicator } from '@/components/ui/QueueStatusIndicator'
import { apiRequest } from '@/lib/apiClient'
import { DynamicSeoLoader } from '@/components/seo/DynamicSeoLoader'
import { LocalRateLimitIndicator, useRateLimitTracking, useVisualProgress, useFileManagement, useApiWithRateLimit, useJobManagement, useArchiveDownload, useProgressBadges, useProgressDisplay, useHeicDetection, ThemedButton, toolThemes, type ToolTheme } from '../shared'

// Define response types for API calls
interface CropResponse {
  status: string;
  data: {
    width: number;
    height: number;
    mime: string;
    filename: string;
    originalFilename: string;
    downloadUrl: string;
  } | {
    jobId: string;
    statusUrl: string;
  };
}

export default function CropTool() {
  const [crop, setCrop] = useState<CropType>({
    unit: 'px',
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [originalDimensions, setOriginalDimensions] = useState<{width: number, height: number}>({ width: 0, height: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  
  const { toast } = useToast()
  const { processingMode } = useProcessingMode()
  
  // Add rate limit tracking
  const { rateLimitUsage, setRateLimitUsage, updateRateLimitFromError } = useRateLimitTracking();
  const { 
    visualProgress, 
    processingFiles, 
    setVisualProgress,
    setProcessingFiles,
    simulateProgress, 
    showResultsAfterProgress: sharedShowResultsAfterProgress, 
    clearAllProgress, 
    adjustProgressIndices 
  } = useVisualProgress();
  
  const {
    files,
    previews,
    selectedFileIndex,
    shouldClearDropzone,
    setFiles,
    setPreviews,
    setSelectedFileIndex,
    setShouldClearDropzone,
    handleImageDrop: sharedHandleImageDrop,
    handleRemoveFile: sharedHandleRemoveFile,
    handleRemoveAllFiles: sharedHandleRemoveAllFiles,
    handleDropzoneClearComplete: sharedHandleDropzoneClearComplete
  } = useFileManagement({
    clearAllProgress,
    adjustProgressIndices,
    onResultsReset: () => setResults([]),
    onJobMappingReset: () => setFileJobMapping({})
  });
  
  const { makeApiRequestWithRateLimitTracking } = useApiWithRateLimit();
  
  const {
    isArchiveLoading,
    handleDownloadArchive: sharedHandleDownloadArchive
  } = useArchiveDownload({
    toolName: "cropped",
    toolAction: "crop",
    makeApiRequestWithRateLimitTracking
  });
  
  const { renderProgressBadge } = useProgressBadges();
  const { renderBackgroundJobProgress, renderVisualProgress, renderBatchProgress, toolTheme } = useProgressDisplay('crop');
  const { renderHeicWarning } = useHeicDetection();
  
  const {
    jobIds,
    jobProgress,
    queueStatus,
    fileJobMapping,
    setJobIds,
    setJobProgress,
    setQueueStatus,
    setFileJobMapping,
    startJobPolling,
    cleanupJobState,
    clearAllJobs
  } = useJobManagement({
    setVisualProgress,
    setProcessingFiles,
    setResults,
    setRateLimitUsage
  });
  
  const imgRef = useRef<HTMLImageElement>(null)
  
  // Get dimensions of the selected image
  useEffect(() => {
    if (selectedFileIndex !== null && files[selectedFileIndex]) {
      const img = new Image()
      img.onload = () => {
        const imgWidth = img.width
        const imgHeight = img.height
        
        setOriginalDimensions({ width: imgWidth, height: imgHeight })
        
        // Reset crop when selecting a new image
        setCrop({
          unit: 'px',
          x: 0,
          y: 0,
          width: 0,
          height: 0
        })
        setCompletedCrop(null)
      }
      img.src = previews[selectedFileIndex]
    }
  }, [selectedFileIndex, files, previews])
  
  // Create wrapper functions that pass the required parameters
  const handleImageDrop = (droppedFiles: File[]) => sharedHandleImageDrop(droppedFiles);
  const handleRemoveFile = (index: number) => sharedHandleRemoveFile(index, results, setResults);
  const handleRemoveAllFiles = () => sharedHandleRemoveAllFiles(results, setResults);
  const handleDropzoneClearComplete = () => sharedHandleDropzoneClearComplete();
  
  // Add this helper function for more reliable coordinate conversion
  const convertToPixelCrop = (crop: CropType, imageWidth: number, imageHeight: number): PixelCrop => {
    const pixelCrop: PixelCrop = {
      unit: 'px',
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    
    if (crop.unit === '%') {
      // Convert from percentage to pixels
      pixelCrop.x = Math.round((crop.x / 100) * imageWidth);
      pixelCrop.y = Math.round((crop.y / 100) * imageHeight);
      pixelCrop.width = Math.round((crop.width / 100) * imageWidth);
      pixelCrop.height = Math.round((crop.height / 100) * imageHeight);
    } else {
      // Already in pixels, just round values
      pixelCrop.x = Math.round(crop.x);
      pixelCrop.y = Math.round(crop.y);
      pixelCrop.width = Math.round(crop.width);
      pixelCrop.height = Math.round(crop.height);
    }
    
    return pixelCrop;
  };
  
  // Function to attempt crop with retry
  const attemptCrop = async (cropParams: any, retryCount = 0): Promise<any> => {
    const { x, y, width, height } = cropParams;
    
    // Make sure we have a valid file
    if (selectedFileIndex === null || !files[selectedFileIndex]) {
      throw new Error("No file selected");
    }
    
    const file = files[selectedFileIndex];
    const imageWidth = originalDimensions.width;
    const imageHeight = originalDimensions.height;
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('left', x.toString());
    formData.append('top', y.toString());
    formData.append('width', width.toString());
    formData.append('height', height.toString());
    
    console.log(`Crop attempt ${retryCount + 1}:`, cropParams);
    
    try {
      // Use makeApiRequestWithRateLimitTracking instead of makeRequest
      const result = await makeApiRequestWithRateLimitTracking<CropResponse>('images/crop', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });
      
      // If this is a queued job, handle it appropriately
      if (result.status === 'processing' && 'jobId' in result.data) {
        const jobId = result.data.jobId;
        const file = files[selectedFileIndex];
        
        // Use shared job polling - the result will be handled by the hook
        startJobPolling(jobId, 'crop', selectedFileIndex, file, createCropResult);
        
        // Return a special marker to indicate this is being handled asynchronously
        return { status: 'processing', data: { jobId } };
      }
      
      // Direct processing result
      return result;
    } catch (error: any) {
      console.error('Crop error:', error);
      
      // Special handling for rate limit errors
      if (error.status === 429) {
        // Force show a toast notification
        toast({
          title: "Rate Limit Reached",
          description: "You've reached your limit for image processing. It will reset after some time.",
          variant: "destructive",
          duration: 5000 // Make it display longer
        });
        
        // Explicitly set the rate limit reached flag
        setRateLimitUsage(prev => ({
          ...prev,
          isLimitReached: true
        }));
        
        throw error; // Let the caller handle the rate limit error
      }
      
      // If we've reached max retries, throw the error
      if (retryCount >= 2) {
        throw error;
      }
      
      // Otherwise, try with a more conservative crop area
      // Reduce crop size by 10% and adjust position to remain within image bounds
      const newWidth = Math.floor(width * 0.9);
      const newHeight = Math.floor(height * 0.9);
      const newX = Math.min(x + Math.floor((width - newWidth) / 2), imageWidth - newWidth);
      const newY = Math.min(y + Math.floor((height - newHeight) / 2), imageHeight - newHeight);
      
      // Retry with adjusted coordinates
      return attemptCrop({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: newWidth,
        height: newHeight
      }, retryCount + 1);
    }
  };
  
  const handleCrop = async () => {
    if (selectedFileIndex === null) {
      toast({
        title: "No file selected",
        description: "Please select an image to crop",
        variant: "destructive"
      })
      return
    }
    
    // Check if file is already cropped
    if (results[selectedFileIndex]) {
      toast({
        title: "Image already cropped",
        description: "This image has already been cropped. You can download it from the preview panel.",
        variant: "default"
      })
      return
    }
    
    if (!completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      toast({
        title: "No crop area selected",
        description: "Please select an area to crop by dragging on the image",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    const croppedResults: any[] = [...results]
    
    // Mark file as being processed and start visual progress
    setProcessingFiles(new Set([selectedFileIndex]))
    setVisualProgress(prev => ({
      ...prev,
      [selectedFileIndex]: 0
    }));
    
    try {
      const file = files[selectedFileIndex];
      
      // Get the original image dimensions
      const imageWidth = originalDimensions.width;
      const imageHeight = originalDimensions.height;
      
      // Calculate scaling factor between displayed image and original dimensions
      const imageElement = imgRef.current
      if (!imageElement) {
        throw new Error("Image reference not available")
      }
      
      // Convert to pixel crop if we have percentage
      let pixelCrop: PixelCrop;
      if (completedCrop.unit !== 'px') {
        pixelCrop = convertToPixelCrop(completedCrop, imageElement.width, imageElement.height);
      } else {
        pixelCrop = completedCrop;
      }
      
      // Calculate scaling ratio between displayed image and original
      const scaleX = imageWidth / imageElement.width;
      const scaleY = imageHeight / imageElement.height;
      
      // Scale the crop coordinates to match the original image dimensions
      const scaledCrop = {
        x: Math.round(pixelCrop.x * scaleX),
        y: Math.round(pixelCrop.y * scaleY),
        width: Math.round(pixelCrop.width * scaleX),
        height: Math.round(pixelCrop.height * scaleY)
      };
      
      // Validate crop coordinates are within image bounds
      if (scaledCrop.x < 0) scaledCrop.x = 0;
      if (scaledCrop.y < 0) scaledCrop.y = 0;
      if (scaledCrop.width <= 0) scaledCrop.width = 1;
      if (scaledCrop.height <= 0) scaledCrop.height = 1;
      if (scaledCrop.x + scaledCrop.width > imageWidth) {
        scaledCrop.width = imageWidth - scaledCrop.x;
      }
      if (scaledCrop.y + scaledCrop.height > imageHeight) {
        scaledCrop.height = imageHeight - scaledCrop.y;
      }
      
      console.log('Image element size:', imageElement.width, 'x', imageElement.height);
      console.log('Original dimensions:', imageWidth, 'x', imageHeight);
      console.log('Original crop:', completedCrop);
      console.log('Pixel crop:', pixelCrop);
      console.log('Scale factors:', scaleX, scaleY);
      console.log('Scaled crop:', scaledCrop);
      
      // Process the crop with retry mechanism
      try {
        const result = await attemptCrop(scaledCrop);
        
        // Check if this is a background job (will be handled by shared hook)
        if (result.status === 'processing' && result.data.jobId) {
          // Job is being processed in background - shared hook will handle completion
          // Just update loading state
          setIsLoading(false);
          return;
        }
        
        // Direct processing result - prepare result object
        const resultObj = {
          filename: file.name,
          originalWidth: originalDimensions.width,
          originalHeight: originalDimensions.height,
          croppedWidth: result.data.width,
          croppedHeight: result.data.height,
          mime: result.data.mime,
          resultFilename: result.data.filename,
          downloadUrl: result.data.downloadUrl || `/api/images/download/${result.data.filename}?originalFilename=${encodeURIComponent(file.name)}`
        };
        
        // Use visual progress for direct processing
        showResultsAfterProgress(selectedFileIndex, resultObj).then(() => {
          // Show success notification after progress completes
          toast({
            title: "✅ Crop completed!",
            description: `${file.name} cropped to ${result.data.width} × ${result.data.height} pixels`,
          });
        });
      } catch (error: any) {
        console.error('Crop failed:', error);
        
        // Clean up progress state on error
        setVisualProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[selectedFileIndex];
          return newProgress;
        });
        
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedFileIndex);
          return newSet;
        });
        
        // Special handling for rate limit errors
        if (error.status === 429) {
          // Rate limit toast is already shown in attemptCrop
          // Set the result to null to indicate it wasn't processed
          croppedResults[selectedFileIndex] = null;
        } else {
          toast({
            title: "Crop failed",
            description: error instanceof Error ? error.message : "An unknown error occurred",
            variant: "destructive"
          });
        }
        
        // Update results even if there was an error
        setResults(croppedResults);
      }
    } catch (error) {
      console.error('Crop error:', error);
      
      // Clean up progress state on major error
      setVisualProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[selectedFileIndex];
        return newProgress;
      });
      
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedFileIndex);
        return newSet;
      });
      
      toast({
        title: "Crop failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Create a wrapper for showResultsAfterProgress that provides setResults
  const showResultsAfterProgress = async (fileIndex: number, result: any) => {
    await sharedShowResultsAfterProgress(fileIndex, result, setResults);
  };
  
  // Result processor for crop jobs
  const createCropResult = (jobResult: any, file: File) => ({
    filename: file.name,
    originalWidth: originalDimensions.width,
    originalHeight: originalDimensions.height,
    croppedWidth: jobResult.width,
    croppedHeight: jobResult.height,
    mime: jobResult.mime,
    resultFilename: jobResult.filename,
    downloadUrl: jobResult.downloadUrl || `/api/images/download/${jobResult.filename}?originalFilename=${encodeURIComponent(file.name)}`
  });

  // Archive download function
  const handleDownloadArchive = () => {
    sharedHandleDownloadArchive(results, (result) => ({
      filename: result.resultFilename,
      originalName: result.filename
    }));
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <DynamicSeoLoader pagePath="/image/crop" />
      <ToolHeader 
        title="Image Cropper" 
        description="Crop your images with precision by selecting the exact area you want to keep."
        icon={<Crop className="h-6 w-6" />}
      />
      
      <div className="grid gap-6 lg:gap-8 mt-6 lg:mt-8">
        {/* File selection area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Dropzone and file list */}
          <div className="order-1 lg:order-1">
            <div className="space-y-4">
              <ImageDropzone 
                onImageDrop={handleImageDrop} 
                existingFiles={files.length}
                shouldClear={shouldClearDropzone}
                onClearComplete={handleDropzoneClearComplete}
              />
              
              {/* Rate Limit Indicator */}
              <LocalRateLimitIndicator 
                usage={rateLimitUsage.used} 
                limit={rateLimitUsage.limit} 
                resetsIn={rateLimitUsage.resetsIn}
                isLimitReached={rateLimitUsage.isLimitReached}
              />
              
              {files.length > 0 && (
                <div className="border rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="font-medium text-sm sm:text-base">
                      Selected Files ({files.length})
                    </h3>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleRemoveAllFiles}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Clear All
                    </Button>
                  </div>
                  
                  <div className="max-h-[200px] sm:max-h-[250px] lg:max-h-[300px] overflow-y-auto space-y-2">
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded ${
                          selectedFileIndex === index ? 'bg-accent' : 'hover:bg-accent/50'
                        } cursor-pointer transition-colors`}
                        onClick={() => setSelectedFileIndex(index)}
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 mr-3 flex-shrink-0 bg-background rounded overflow-hidden">
                            <img 
                              src={previews[index]} 
                              alt={file.name} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="overflow-hidden min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <p className="text-xs text-muted-foreground">
                                {results[index] ? (
                                  <span>{results[index].originalWidth}×{results[index].originalHeight} → {results[index].croppedWidth}×{results[index].croppedHeight}</span>
                                ) : (
                                  <span>Dimensions will appear here</span>
                                )}
                              </p>
                              {/* Show appropriate badge based on processing state */}
                              {renderProgressBadge({
                                index,
                                results,
                                processingFiles,
                                visualProgress,
                                fileJobMapping,
                                jobProgress,
                                completedText: "Cropped"
                              })}
                            </div>
                          </div>
                        </div>
                        <button 
                          className="p-1.5 hover:bg-background rounded ml-2 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Preview and info */}
          <div className="order-2 lg:order-2">
            <div className="border rounded-lg p-3 sm:p-4 h-full flex flex-col">
              <h3 className="font-medium mb-4 text-sm sm:text-base">File Preview</h3>
              
              {selectedFileIndex !== null ? (
                <div className="flex-grow flex flex-col">
                  <div className="flex-grow flex items-center justify-center bg-accent/20 rounded-lg mb-4 overflow-hidden min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
                    <img 
                      src={previews[selectedFileIndex]} 
                      alt={files[selectedFileIndex].name}
                      className="max-h-[400px] max-w-full object-contain"
                    />
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <div className="grid grid-cols-1 gap-2">
                      <p className="break-all">
                        <span className="font-medium">Name:</span> {files[selectedFileIndex].name}
                      </p>
                      <p>
                        <span className="font-medium">Original Size:</span> {originalDimensions.width} × {originalDimensions.height} px
                      </p>
                    </div>
                    
                    {results[selectedFileIndex] && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-green-600 mb-2">Crop Results:</p>
                        <p className="mb-3">New dimensions: {results[selectedFileIndex].croppedWidth} × {results[selectedFileIndex].croppedHeight} px</p>
                        <div>
                          <a 
                            href={`${getApiUrl().replace('/api', '')}${results[selectedFileIndex].downloadUrl}`}
                            className="text-xs inline-flex items-center px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                          >
                            <Download className="h-3 w-3 mr-1" /> Download
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Show progress for background jobs */}
                    {renderBackgroundJobProgress({
                      selectedFileIndex,
                      results,
                      fileJobMapping,
                      jobProgress,
                      queueStatus
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center text-center text-muted-foreground bg-accent/10 rounded-lg min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
                  <div>
                    <Crop className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-30" />
                    {files.length > 0 ? (
                      <p className="text-sm sm:text-base">Select an image from the list to preview</p>
                    ) : (
                      <p className="text-sm sm:text-base">Upload images to get started</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Crop Area */}
        {selectedFileIndex !== null && (
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg font-medium">Crop Image</h3>
              {processingMode === 'queued' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Server className="h-3 w-3" /> Queue mode
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              {/* Image preview with crop */}
              <div className="xl:col-span-2">
                <div className="bg-accent/10 rounded-lg p-4 overflow-hidden">
                  {previews[selectedFileIndex] && (
                    <div className="flex justify-center">
                      <ReactCrop
                        crop={crop}
                        onChange={(c: CropType) => setCrop(c)}
                        onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                        aspect={undefined}
                        circularCrop={false}
                      >
                        <img
                          ref={imgRef}
                          src={previews[selectedFileIndex]}
                          alt={files[selectedFileIndex].name}
                          style={{ 
                            maxHeight: '450px', 
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto'
                          }}
                          onLoad={(e) => {
                            // Once the image is loaded, update the originalDimensions with natural dimensions
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalHeight) {
                              setOriginalDimensions({
                                width: img.naturalWidth,
                                height: img.naturalHeight
                              });
                            }
                          }}
                        />
                      </ReactCrop>
                    </div>
                  )}
                  
                  <div className="w-full mt-4 text-sm text-center text-muted-foreground">
                    <p>Click and drag on the image to select the area you want to crop.</p>
                  </div>
                </div>
              </div>
              
              {/* Crop controls */}
              <div className="xl:col-span-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="crop-x" className="text-sm font-medium">X Position</Label>
                    <Input
                      id="crop-x"
                      type="number"
                      min="0"
                      max={originalDimensions.width - (completedCrop?.width || 0)}
                      value={Math.round(completedCrop?.x || 0)}
                      onChange={(e) => {
                        const x = parseInt(e.target.value) || 0
                        setCrop((prev: CropType) => ({ ...prev, x }))
                        setCompletedCrop((prev: PixelCrop | null) => prev ? { ...prev, x } : null)
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="crop-y" className="text-sm font-medium">Y Position</Label>
                    <Input
                      id="crop-y"
                      type="number"
                      min="0"
                      max={originalDimensions.height - (completedCrop?.height || 0)}
                      value={Math.round(completedCrop?.y || 0)}
                      onChange={(e) => {
                        const y = parseInt(e.target.value) || 0
                        setCrop((prev: CropType) => ({ ...prev, y }))
                        setCompletedCrop((prev: PixelCrop | null) => prev ? { ...prev, y } : null)
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="crop-width" className="text-sm font-medium">Width (px)</Label>
                    <Input
                      id="crop-width"
                      type="number"
                      min="1"
                      max={originalDimensions.width}
                      value={Math.round(completedCrop?.width || 0)}
                      onChange={(e) => {
                        const width = parseInt(e.target.value) || 0
                        setCrop((prev: CropType) => ({ ...prev, width }))
                        setCompletedCrop((prev: PixelCrop | null) => prev ? { ...prev, width } : null)
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="crop-height" className="text-sm font-medium">Height (px)</Label>
                    <Input
                      id="crop-height"
                      type="number"
                      min="1"
                      max={originalDimensions.height}
                      value={Math.round(completedCrop?.height || 0)}
                      onChange={(e) => {
                        const height = parseInt(e.target.value) || 0
                        setCrop((prev: CropType) => ({ ...prev, height }))
                        setCompletedCrop((prev: PixelCrop | null) => prev ? { ...prev, height } : null)
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Info box */}
                  <div className="bg-accent/20 rounded p-3 text-sm">
                    <p><strong>Original Size:</strong> {originalDimensions.width} × {originalDimensions.height} px</p>
                    {completedCrop && (
                      <>
                        <p><strong>Crop Size:</strong> {Math.round(completedCrop.width)} × {Math.round(completedCrop.height)} px</p>
                        <p><strong>Position:</strong> X: {Math.round(completedCrop.x)}, Y: {Math.round(completedCrop.y)}</p>
                      </>
                    )}
                  </div>
                  
                  {/* HEIC/HEIF Detection Warning */}
                  {renderHeicWarning({
                    files,
                    selectedFileIndex,
                    message: "HEIC/HEIF files are automatically converted to JPEG before cropping. Original files remain unchanged."
                  })}
                  
                  {/* Visual Progress Bar */}
                  {renderVisualProgress({
                    selectedFileIndex,
                    processingFiles,
                    visualProgress,
                    actionText: "Cropping image",
                    toolTheme
                  })}
                  
                  <ThemedButton 
                    toolTheme={toolTheme}
                    className="w-full" 
                    onClick={handleCrop}
                    disabled={!completedCrop || !completedCrop.width || !completedCrop.height || (selectedFileIndex !== null && results[selectedFileIndex])}
                    isLoading={isLoading}
                    loadingText="Cropping..."
                  >
                    <Crop className="mr-2 h-4 w-4" /> Crop Image
                  </ThemedButton>
                  
                  {/* Show message if already processed */}
                  {selectedFileIndex !== null && results[selectedFileIndex] && !isLoading && (
                    <div className="text-center text-sm text-muted-foreground">
                      <p className="flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Image already cropped and ready for download.
                      </p>
                    </div>
                  )}
                  
                  {/* ZIP Download Button */}
                  {results.filter(r => r).length > 1 && (
                    <ThemedButton 
                      toolTheme={toolTheme}
                      className="w-full" 
                      variant="outline"
                      onClick={handleDownloadArchive}
                      isLoading={isArchiveLoading}
                      loadingText="Creating archive..."
                    >
                      <Download className="mr-2 h-4 w-4" /> Download All as ZIP
                    </ThemedButton>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Info message if no image is selected */}
        {selectedFileIndex === null && files.length > 0 && (
          <div className="text-center p-6 sm:p-8 bg-accent/10 rounded-lg">
            <Crop className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">Select an Image to Crop</h3>
            <p className="text-muted-foreground text-sm sm:text-base">Choose an image from the list above to start cropping.</p>
          </div>
        )}
        
        {/* Empty state */}
        {files.length === 0 && (
          <div className="text-center p-6 sm:p-8 bg-accent/10 rounded-lg">
            <Crop className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">No Images Uploaded</h3>
            <p className="text-muted-foreground text-sm sm:text-base">Upload an image using the dropzone above to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
} 