'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { ToolHeader } from '@/components/tools/ToolHeader'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { 
  ImageIcon, Download, X, Trash2, 
  Maximize2, Lock, Unlock, 
  ArrowDownSquare, ArrowRightSquare, Package, Plus, RotateCcw, RefreshCw, CheckCircle, Server
} from 'lucide-react'
import ImageDropzone from '@/components/tools/ImageDropzone'
import { useToast } from '@/components/ui/use-toast'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { processHeicFiles } from '@/lib/heicConverter'

import { getApiUrl } from '@/lib/apiClient'

import { useProcessingMode } from '@/lib/context/ProcessingModeContext'
import { QueueStatusIndicator } from '@/components/ui/QueueStatusIndicator'
import { apiRequest } from '@/lib/apiClient'
import { DynamicSeoLoader } from '@/components/seo/DynamicSeoLoader'
import { LocalRateLimitIndicator, useRateLimitTracking, useVisualProgress, useFileManagement, useApiWithRateLimit, useJobManagement, useArchiveDownload, useProgressBadges, useProgressDisplay, useHeicDetection, ThemedButton, toolThemes, type ToolTheme } from '../shared'

// Define response types for API calls
interface ResizeResponse {
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
  }
}

interface ArchiveResponse {
  status: string;
  data: {
    downloadUrl: string;
  }
}

export default function ResizeTool() {
  const [originalDimensions, setOriginalDimensions] = useState<{width: number, height: number}>({ width: 0, height: 0 })
  const [width, setWidth] = useState<number>(0)
  const [height, setHeight] = useState<number>(0)
  const [aspectRatioLocked, setAspectRatioLocked] = useState<boolean>(true)
  const [aspectRatio, setAspectRatio] = useState<number>(1)
  const [resizeMode, setResizeMode] = useState<string>('cover')
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
    toolName: "resized",
    toolAction: "resize",
    makeApiRequestWithRateLimitTracking
  });
  
  const { renderProgressBadge } = useProgressBadges();
  const { renderBackgroundJobProgress, renderVisualProgress, renderBatchProgress, toolTheme } = useProgressDisplay('resize');
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
  
  // Create a wrapper for showResultsAfterProgress that provides setResults
  const showResultsAfterProgress = async (fileIndex: number, result: any) => {
    await sharedShowResultsAfterProgress(fileIndex, result, setResults);
  };
  
  // Result processor for resize jobs
  const createResizeResult = (jobResult: any, file: File, originalDimensions?: { width: number; height: number }) => ({
    filename: file.name,
    originalWidth: originalDimensions?.width || jobResult.originalWidth,
    originalHeight: originalDimensions?.height || jobResult.originalHeight,
    newWidth: jobResult.width,
    newHeight: jobResult.height,
    mime: jobResult.mime,
    resultFilename: jobResult.filename,
    downloadUrl: jobResult.downloadUrl
  });
  
  // Get dimensions of the selected image
  useEffect(() => {
    if (selectedFileIndex !== null && files[selectedFileIndex]) {
      const img = new Image()
      img.onload = () => {
        const imgWidth = img.width
        const imgHeight = img.height
        
        setOriginalDimensions({ width: imgWidth, height: imgHeight })
        setWidth(imgWidth)
        setHeight(imgHeight)
        setAspectRatio(imgWidth / imgHeight)
      }
      img.src = previews[selectedFileIndex]
    }
  }, [selectedFileIndex, files, previews])
  
  // Update height when width changes and aspect ratio is locked
  useEffect(() => {
    if (aspectRatioLocked && width > 0) {
      const newHeight = Math.round(width / aspectRatio)
      setHeight(newHeight)
    }
  }, [width, aspectRatio, aspectRatioLocked])
  
  // Update width when height changes and aspect ratio is locked
  useEffect(() => {
    if (aspectRatioLocked && height > 0 && !isNaN(height)) {
      const newWidth = Math.round(height * aspectRatio)
      setWidth(newWidth)
    }
  }, [height, aspectRatio, aspectRatioLocked])
  
  // Create wrapper functions that pass the required parameters
  const handleImageDrop = (droppedFiles: File[]) => sharedHandleImageDrop(droppedFiles);
  const handleRemoveFile = (index: number) => sharedHandleRemoveFile(index, results, setResults);
  const handleRemoveAllFiles = () => sharedHandleRemoveAllFiles(results, setResults);
  const handleDropzoneClearComplete = () => sharedHandleDropzoneClearComplete();
  
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value)
    if (!isNaN(newWidth)) {
      setWidth(newWidth)
    }
  }
  
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value)
    if (!isNaN(newHeight)) {
      setHeight(newHeight)
    }
  }
  
  const toggleAspectRatio = () => {
    setAspectRatioLocked(!aspectRatioLocked)
    
    // If we're re-locking the aspect ratio, update based on current dimensions
    if (!aspectRatioLocked && width > 0 && height > 0) {
      setAspectRatio(width / height)
    }
  }
  
  const handleResetDimensions = () => {
    if (selectedFileIndex !== null) {
      setWidth(originalDimensions.width)
      setHeight(originalDimensions.height)
      setAspectRatio(originalDimensions.width / originalDimensions.height)
    }
  }
  
  const handleSetPercentage = (percentage: number) => {
    if (selectedFileIndex !== null) {
      const newWidth = Math.round(originalDimensions.width * (percentage / 100))
      setWidth(newWidth)
      // Height will be automatically adjusted if aspect ratio is locked
    }
  }
  
  const handleResizeSingle = async () => {
    if (selectedFileIndex === null) {
      toast({
        title: "No file selected",
        description: "Please select an image to resize",
        variant: "destructive"
      })
      return
    }
    
    // Check if file is already resized
    if (results[selectedFileIndex]) {
      toast({
        title: "Image already resized",
        description: "This image has already been resized. You can download it from the preview panel.",
        variant: "default"
      })
      return
    }
    
    const file = files[selectedFileIndex]
    await resizeFiles([file], [selectedFileIndex])
  }
  
  const handleResizeAll = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one image to resize",
        variant: "destructive"
      })
      return
    }
    
    // Filter out already resized files
    const unresizedFiles: File[] = []
    const unresizedIndices: number[] = []
    
    files.forEach((file, index) => {
      if (!results[index]) {
        unresizedFiles.push(file)
        unresizedIndices.push(index)
      }
    })
    
    if (unresizedFiles.length === 0) {
      toast({
        title: "All images already resized",
        description: "All images have already been resized. You can download them using the ZIP download button.",
        variant: "default"
      })
      return
    }
    
    await resizeFiles(unresizedFiles, unresizedIndices)
  }
  
  const resizeFiles = async (filesToResize: File[], fileIndices: number[]) => {
    setIsLoading(true)
    const resizedResults: any[] = [...results]
    
    // Mark files as being processed and start visual progress
    setProcessingFiles(new Set(fileIndices))
    
    try {
      for (let i = 0; i < filesToResize.length; i++) {
        const file = filesToResize[i]
        const index = fileIndices[i]
        
        // Start visual progress for this file
        setVisualProgress(prev => ({
          ...prev,
          [index]: 0
        }));
        
        const formData = new FormData()
        formData.append('image', file)
        formData.append('width', width.toString())
        formData.append('height', height.toString())
        formData.append('fit', resizeMode)
        
        try {
          // Use makeApiRequestWithRateLimitTracking instead of makeRequest
          const result = await makeApiRequestWithRateLimitTracking<ResizeResponse>('images/resize', {
            method: 'POST',
            body: formData,
            isFormData: true,
          });
          
          // Check if this is a direct response or a job that needs polling
          if (result.status === 'success' && 'width' in result.data) {
            // Direct processing - use visual progress
            const resultData = result.data as {
              width: number;
              height: number;
              mime: string;
              filename: string;
              originalFilename: string;
              downloadUrl: string;
            };
            
            const resultObj = createResizeResult(resultData, file, originalDimensions);
            
            // Start visual progress simulation for direct processing
            showResultsAfterProgress(index, resultObj).then(() => {
              // Show success notification after progress completes
              toast({
                title: "✅ Resize completed!",
                description: `${file.name} resized to ${resultData.width}×${resultData.height} pixels`,
              });
            });
          } else if (result.status === 'processing' && 'jobId' in result.data) {
            // Background processing - use shared job polling
            const jobId = result.data.jobId;
            startJobPolling(jobId, 'resize', index, file, (jobResult, file) => createResizeResult(jobResult, file, originalDimensions));
          }
        } catch (error: any) {
          console.error(`Failed to resize file ${i+1}/${filesToResize.length}:`, error);
          
          // Clean up progress state on error
          setVisualProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[index];
            return newProgress;
          });
          
          setProcessingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
          });
          
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
            
            // Do not mark files as processed if they hit the rate limit
            resizedResults[index] = null;
            
            // Stop processing more files if we hit a rate limit
            break;
          } else {
            // For other errors, just continue to the next file
            toast({
              title: `Failed to resize file ${i+1}/${filesToResize.length}`,
              description: error.message || "An unexpected error occurred",
              variant: "destructive"
            });
            
            // Mark the file as failed
            resizedResults[index] = null;
          }
          
          // Continue with other files instead of stopping the whole batch
          continue;
        }
      }
      
      // Update results for direct processing (this is handled by showResultsAfterProgress now)
      // setResults(resizedResults)
      
      // Only show success toast if we're not waiting for background jobs
      // (Individual success toasts are now shown after progress completes)
      
    } catch (error) {
      console.error('Resize error:', error)
      
      // Clean up all progress states on major error
      setVisualProgress({});
      setProcessingFiles(new Set());
      
      toast({
        title: "Resize failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      // Only set loading to false if we're not waiting for background jobs
      if (jobIds.length === 0) {
        setIsLoading(false)
      }
    }
  }
  
  const handleDownloadArchive = () => {
    sharedHandleDownloadArchive(results, (result) => ({
      filename: result.resultFilename,
      originalName: result.filename
    }));
  };
  

  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <DynamicSeoLoader pagePath="/image/resize" />
      <ToolHeader 
        title="Image Resizer" 
        description="Resize your images with precision while maintaining optimal quality."
        icon={<Maximize2 className="h-6 w-6" />}
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
                                  <span>{results[index].originalWidth}×{results[index].originalHeight} → {results[index].newWidth}×{results[index].newHeight}</span>
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
                                completedText: "Resized"
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
          
          {/* Right side - Preview and settings */}
          <div className="order-2 lg:order-2">
            <div className="border rounded-lg p-3 sm:p-4 h-full flex flex-col">
              <h3 className="font-medium mb-4 text-sm sm:text-base">Image Preview</h3>
              
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
                        <p className="font-medium text-green-600 mb-2">Resize Results:</p>
                        <p className="mb-3">New dimensions: {results[selectedFileIndex].newWidth} × {results[selectedFileIndex].newHeight} px</p>
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
                    {selectedFileIndex !== null && 
                     !results[selectedFileIndex] && 
                     fileJobMapping[selectedFileIndex] && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-yellow-600 mb-2">Processing Image...</p>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2">
                          <div
                            className="h-full bg-yellow-500 transition-all duration-300"
                            style={{ width: `${jobProgress[fileJobMapping[selectedFileIndex]] || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                         {jobProgress[fileJobMapping[selectedFileIndex]] 
                           ? `${Math.round(jobProgress[fileJobMapping[selectedFileIndex]])}% complete` 
                           : 'Starting process...'}
                        </p>
                        
                        {/* Show queue status if available */}
                        {fileJobMapping[selectedFileIndex] && queueStatus[fileJobMapping[selectedFileIndex]] && (
                          <div className="mt-2">
                            <QueueStatusIndicator
                              queuePosition={queueStatus[fileJobMapping[selectedFileIndex]]?.position}
                              estimatedWaitTime={queueStatus[fileJobMapping[selectedFileIndex]]?.waitTime}
                              isProcessing={queueStatus[fileJobMapping[selectedFileIndex]]?.isProcessing}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center text-center text-muted-foreground bg-accent/10 rounded-lg min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
                  <div>
                    <Maximize2 className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-30" />
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
        
        {/* Resize settings and actions */}
        <Card className="p-4 sm:p-6">
          <Tabs defaultValue="single" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-lg font-medium">Resize Settings</h3>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {processingMode === 'queued' && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Server className="h-3 w-3" /> Queue mode
                  </span>
                )}
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="single" disabled={files.length === 0} className="flex-1 sm:flex-none">
                    Single Image
                  </TabsTrigger>
                  <TabsTrigger value="batch" disabled={files.length < 2} className="flex-1 sm:flex-none">
                    Batch Resize
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <div className="grid gap-4 sm:gap-6">
              {/* Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width" className="text-sm font-medium">Width (px)</Label>
                  <div className="mt-2">
                    <Input
                      id="width"
                      type="number"
                      min="1"
                      value={width}
                      onChange={handleWidthChange}
                      disabled={!originalDimensions.width}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="height" className="text-sm font-medium">Height (px)</Label>
                  <div className="mt-2">
                    <Input
                      id="height"
                      type="number"
                      min="1"
                      value={height}
                      onChange={handleHeightChange}
                      disabled={!originalDimensions.height}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              {/* Aspect Ratio Control */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAspectRatio}
                  disabled={!originalDimensions.width}
                  className="w-full sm:w-auto"
                >
                  {aspectRatioLocked ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" /> Keep Aspect Ratio
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-2" /> Free Resize
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDimensions}
                  disabled={!originalDimensions.width}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Original
                </Button>
              </div>
              
              {/* Predefined Sizes */}
              <div>
                <Label className="text-sm font-medium">Quick Resize</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSetPercentage(25)}
                    disabled={!originalDimensions.width}
                    className="text-xs"
                  >
                    25%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSetPercentage(50)}
                    disabled={!originalDimensions.width}
                    className="text-xs"
                  >
                    50%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSetPercentage(75)}
                    disabled={!originalDimensions.width}
                    className="text-xs"
                  >
                    75%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSetPercentage(100)}
                    disabled={!originalDimensions.width}
                    className="text-xs"
                  >
                    100%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSetPercentage(150)}
                    disabled={!originalDimensions.width}
                    className="text-xs"
                  >
                    150%
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSetPercentage(200)}
                    disabled={!originalDimensions.width}
                    className="text-xs"
                  >
                    200%
                  </Button>
                </div>
              </div>
              
              {/* Resize Mode */}
              <div className="space-y-2">
                <Label htmlFor="resize-mode" className="text-sm font-medium">Resize Mode</Label>
                <Select value={resizeMode} onValueChange={setResizeMode}>
                  <SelectTrigger id="resize-mode" className="w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover (fills area, may crop)</SelectItem>
                    <SelectItem value="contain">Contain (fits within dimensions)</SelectItem>
                    <SelectItem value="fill">Fill (stretch to fit)</SelectItem>
                    <SelectItem value="inside">Inside (fits within, no enlargement)</SelectItem>
                    <SelectItem value="outside">Outside (covers area, no crop)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {resizeMode === 'cover' && "Resizes to fill dimensions, maintaining aspect ratio but may crop edges."}
                  {resizeMode === 'contain' && "Resizes to fit within dimensions while maintaining aspect ratio."}
                  {resizeMode === 'fill' && "Stretches or squeezes image to exactly match dimensions."}
                  {resizeMode === 'inside' && "Like 'contain' but won't enlarge if smaller than dimensions."}
                  {resizeMode === 'outside' && "Like 'cover' but ensures dimensions are fully covered without cropping."}
                </p>
                {/* HEIC/HEIF Detection Warning */}
                {renderHeicWarning({
                  files,
                  selectedFileIndex,
                  message: "HEIC/HEIF files are automatically converted to JPEG before resizing. Original files remain unchanged."
                })}
              </div>
            </div>
            
            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Visual Progress Bar for Single Image */}
              {renderVisualProgress({
                selectedFileIndex,
                processingFiles,
                visualProgress,
                actionText: "Resizing image",
                toolTheme
              })}
              
              <ThemedButton 
                toolTheme={toolTheme}
                className="w-full" 
                size="lg" 
                onClick={handleResizeSingle}
                disabled={selectedFileIndex === null || !width || !height || (selectedFileIndex !== null && results[selectedFileIndex])}
                isLoading={isLoading}
                loadingText="Resizing..."
              >
                <ArrowDownSquare className="mr-2 h-4 w-4" /> Resize Selected Image
              </ThemedButton>
              
              {/* Show message if already processed */}
              {selectedFileIndex !== null && results[selectedFileIndex] && !isLoading && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Image already resized and ready for download.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="batch" className="space-y-4 mt-4">
              {/* Visual Progress Bar for Batch Processing */}
              {renderBatchProgress({
                processingFiles,
                visualProgress,
                files,
                actionText: "Resizing",
                toolTheme
              })}
              
              <ThemedButton 
                toolTheme={toolTheme}
                className="w-full" 
                size="lg" 
                onClick={handleResizeAll}
                disabled={files.length === 0 || !width || !height || files.every((_, index) => results[index])}
                isLoading={isLoading}
                loadingText="Resizing..."
              >
                <ArrowRightSquare className="mr-2 h-4 w-4" /> Resize All Images
              </ThemedButton>
              
              {/* Show message if all files are already processed */}
              {files.length > 0 && files.every((_, index) => results[index]) && !isLoading && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    All images already resized and ready for download.
                  </p>
                </div>
              )}
              
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
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
} 