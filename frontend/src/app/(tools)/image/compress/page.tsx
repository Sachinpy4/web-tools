'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { ToolHeader } from '@/components/tools/ToolHeader'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ImageIcon, Download, X, Trash2, Plus, Package, Server, WifiOff, RefreshCw, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import ImageDropzone from '@/components/tools/ImageDropzone'
import { useToast } from '@/components/ui/use-toast'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { processHeicFiles } from '@/lib/heicConverter'
import { useProcessingMode } from '@/lib/context/ProcessingModeContext'

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { apiRequest, getApiUrl } from '@/lib/apiClient'
import { QueueStatusIndicator } from '@/components/ui/QueueStatusIndicator'
import { DynamicSeoLoader } from '@/components/seo/DynamicSeoLoader'
import { LocalRateLimitIndicator, useRateLimitTracking, useVisualProgress, useFileManagement, useApiWithRateLimit, useJobManagement, useArchiveDownload, useProgressBadges, useProgressDisplay, useHeicDetection, ThemedButton, toolThemes, type ToolTheme } from '../shared'

// Define types for API responses
interface CompressResponse {
  status: string;
  data: {
    jobId?: string;
    compressedSize: number;
    compressionRatio: number;
    originalFilename: string;
    filename: string;
    downloadUrl: string;
  }
}

interface ArchiveResponse {
  status: string;
  data: {
    downloadUrl: string;
  }
}

export default function CompressTool() {
  const [quality, setQuality] = useState(80)

  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [pendingResults, setPendingResults] = useState<any[]>([]) // store results until progress reaches 100%
  

  
  const { toast } = useToast()
  const { processingMode, isConnected, isInitializing, serverState, errorDetails, nextRetryTime, retryConnection } = useProcessingMode()
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
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
    toolName: "compressed",
    toolAction: "compress",
    makeApiRequestWithRateLimitTracking
  });
  
  const { renderProgressBadge } = useProgressBadges();
  const { renderBackgroundJobProgress, renderVisualProgress, renderBatchProgress, toolTheme } = useProgressDisplay('compress');
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
  
  // Calculate retry countdown
  useEffect(() => {
    if (!nextRetryTime) {
      setRetryCountdown(null);
      return;
    }
    
    const updateCountdown = () => {
      const secondsLeft = Math.max(0, Math.ceil((nextRetryTime - Date.now()) / 1000));
      setRetryCountdown(secondsLeft);
      
      if (secondsLeft <= 0) {
        clearInterval(intervalId);
      }
    };
    
    // Initial update
    updateCountdown();
    
    // Update every second
    const intervalId = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(intervalId);
  }, [nextRetryTime]);
  
  // Create a wrapper for showResultsAfterProgress that provides setResults
  const showResultsAfterProgress = async (fileIndex: number, result: any) => {
    await sharedShowResultsAfterProgress(fileIndex, result, setResults);
  };
  
  // Result processor for compress jobs
  const createCompressResult = (jobResult: any, file: File) => ({
    filename: file.name,
    originalSize: file.size,
    compressedSize: jobResult.compressedSize,
    compressionRatio: jobResult.compressionRatio,
    qualityUsed: quality,
    originalFilename: jobResult.originalFilename,
    resultFilename: jobResult.filename,
    downloadUrl: jobResult.downloadUrl
  });
  
  // Create wrapper functions that pass the required parameters
  const handleImageDrop = (droppedFiles: File[]) => sharedHandleImageDrop(droppedFiles);
  const handleRemoveFile = (index: number) => sharedHandleRemoveFile(index, results, setResults);
  const handleRemoveAllFiles = () => sharedHandleRemoveAllFiles(results, setResults);
  const handleDropzoneClearComplete = () => sharedHandleDropzoneClearComplete();
  
  const handleCompressSingle = async () => {
    if (selectedFileIndex === null) {
      toast({
        title: "No file selected",
        description: "Please select an image to compress",
        variant: "destructive"
      })
      return
    }
    
    // Check if file is already compressed
    if (results[selectedFileIndex]) {
      toast({
        title: "Image already compressed",
        description: "This image has already been compressed. You can download it from the preview panel.",
        variant: "default"
      })
      return
    }
    
    const file = files[selectedFileIndex]
    await compressFiles([file], [selectedFileIndex])
  }
  
  const handleCompressAll = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one image to compress",
        variant: "destructive"
      })
      return
    }
    
    // Filter out already compressed files
    const uncompressedFiles: File[] = []
    const uncompressedIndices: number[] = []
    
    files.forEach((file, index) => {
      if (!results[index]) {
        uncompressedFiles.push(file)
        uncompressedIndices.push(index)
      }
    })
    
    if (uncompressedFiles.length === 0) {
      toast({
        title: "All images already compressed",
        description: "All images have already been compressed. You can download them using the ZIP download button.",
        variant: "default"
      })
      return
    }
    
    await compressFiles(uncompressedFiles, uncompressedIndices)
  }
  
  const compressFiles = async (filesToCompress: File[], fileIndices: number[]) => {
    setIsLoading(true)
    const compressedResults: any[] = [...results]
    
    // Mark files as being processed and start visual progress
    setProcessingFiles(new Set(fileIndices))
    
    try {
      // Check if backend is connected
      if (!isConnected) {
        toast({
          title: "Server unavailable",
          description: "Cannot connect to the server. Please try again later.",
          variant: "destructive"
        });
        setIsLoading(false);
        // Clear processing state
        setProcessingFiles(new Set())
        return;
      }
      
      for (let i = 0; i < filesToCompress.length; i++) {
        const file = filesToCompress[i]
        const index = fileIndices[i]
        
        // Start visual progress for this file
        setVisualProgress(prev => ({
          ...prev,
          [index]: 0
        }));
        
        const formData = new FormData()
        formData.append('image', file)
        formData.append('quality', quality.toString())
        
        try {
          // Use the shared API request function with rate limit tracking
          const result = await makeApiRequestWithRateLimitTracking<CompressResponse>('images/compress', {
            method: 'POST',
            body: formData,
            isFormData: true,
          });
          
          console.log('🔍 FRONTEND COMPRESS - API response:', result);
          
          // Handle queued response (with jobId) vs direct response
          if (result.status === 'processing' && result.data.jobId) {
            console.log('🚀 FRONTEND COMPRESS - Queued processing:', result.data);
            // Queued processing - use shared job polling
            startJobPolling(result.data.jobId, 'compress', index, file, createCompressResult);
            
          } else {
            console.log('⚡ FRONTEND COMPRESS - Direct processing:', result.data);
            // Direct processing - immediate result, but use visual progress
            const resultObj = createCompressResult(result.data, file);
            console.log('🎯 FRONTEND COMPRESS - Created result object:', resultObj);
            
            // Start visual progress simulation for direct processing
            showResultsAfterProgress(index, resultObj).then(() => {
              // Show success notification after progress completes
              toast({
                title: "✅ Compression completed!",
                description: `${file.name} compressed successfully (${result.data.compressionRatio}% file size reduction)`,
              });
            });
          }
        } catch (error: any) {
          // Update rate limit info from error
          updateRateLimitFromError(error);
          
          if (error.status === 429) {
            // Show rate limit error toast
            toast({
              title: "Rate limit reached",
              description: "You've reached the image processing limit. Please try again later.",
              variant: "destructive"
            });
            
            // Explicitly set the rate limit reached flag
            setRateLimitUsage(prev => ({
              ...prev,
              isLimitReached: true
            }));
            
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
            
            // Mark the file as failed
            compressedResults[index] = null;
          } else {
            // For other errors, just continue to the next file
            toast({
              title: `Failed to compress file ${i+1}/${filesToCompress.length}`,
              description: error.message || "An unexpected error occurred",
              variant: "destructive"
            });
            
            // Mark the file as failed
            compressedResults[index] = null;
          }
          
          // Continue with other files instead of stopping the whole batch
          continue;
        }
      }
      
      // Update results for direct processing (this is handled by showResultsAfterProgress now)
      // setResults(compressedResults)
      
      // Only show success toast if at least one file was successfully compressed
      // (Individual success toasts are now shown after progress completes)
      
    } catch (error) {
      console.error('Compression error:', error)
      
      // Clean up all progress states on major error
      setVisualProgress({});
      setProcessingFiles(new Set());
      
      toast({
        title: "Compression failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      // Only set loading to false if direct processing or all jobs failed
      if (processingMode !== 'queued' || jobIds.length === 0) {
        setIsLoading(false)
      }
    }
  }
  
  // Set loading to false when all jobs complete
  useEffect(() => {
    if (jobIds.length === 0 && isLoading) {
      setIsLoading(false)
    }
  }, [jobIds, isLoading])
  
  const handleDownloadArchive = () => {
    sharedHandleDownloadArchive(results, (result) => ({
      filename: result.resultFilename,
      originalName: result.originalFilename
    }));
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <DynamicSeoLoader pagePath="/image/compress" />
      <ToolHeader 
        title="Image Compression" 
        description="Compress JPG, PNG, SVG, and GIFs while saving space and maintaining quality."
        icon={<ImageIcon className="h-6 w-6" />}
      />
      
      {/* Server Status Messages */}
      {serverState === 'connecting' && (
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
            <LoadingSpinner className="h-4 w-4 sm:h-5 sm:w-5" />
            <h3 className="font-medium text-sm sm:text-base">Connecting to server...</h3>
          </div>
          <p className="text-xs sm:text-sm mt-1 text-blue-700 dark:text-blue-500">
            Establishing connection to the backend. Image processing will be available shortly.
          </p>
        </div>
      )}
      
      {serverState === 'circuit-open' && (
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-purple-800 dark:text-purple-400">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="font-medium text-sm sm:text-base">Connection attempts paused</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={retryConnection}
              className="w-full sm:w-auto text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-700"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Force Retry
            </Button>
          </div>
          <p className="text-xs sm:text-sm mt-1 text-purple-700 dark:text-purple-500">
            Connection attempts temporarily paused to prevent excessive requests. 
            {retryCountdown !== null && retryCountdown > 0 ? (
              <span> Automatically retrying in <strong>{retryCountdown}</strong> seconds.</span>
            ) : (
              <span> Retrying connection...</span>
            )}
          </p>
        </div>
      )}
      
      {serverState === 'unavailable' && (
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <WifiOff className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="font-medium text-sm sm:text-base">Server unavailable</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={retryConnection}
              className="w-full sm:w-auto text-red-800 dark:text-red-400 border-red-300 dark:border-red-700"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Retry Connection
            </Button>
          </div>
          <p className="text-xs sm:text-sm mt-1 text-red-700 dark:text-red-500">
            The backend server is not responding. Please make sure the server is running at {getApiUrl()}.
            {retryCountdown !== null && retryCountdown > 0 && (
              <span> Next attempt in <strong>{retryCountdown}</strong> seconds.</span>
            )}
          </p>
        </div>
      )}
      
      {serverState === 'error' && (
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="font-medium text-sm sm:text-base">Server error</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={retryConnection}
              className="w-full sm:w-auto text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Retry Connection
            </Button>
          </div>
          <p className="text-xs sm:text-sm mt-1 text-yellow-700 dark:text-yellow-500">
            The server returned an error: {errorDetails || 'Unknown error'}
            {retryCountdown !== null && retryCountdown > 0 && (
              <span> Retrying in <strong>{retryCountdown}</strong> seconds.</span>
            )}
          </p>
        </div>
      )}
      
      {serverState === 'connected' && !isConnected && (
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
              <Server className="h-4 w-4 sm:h-5 sm:w-5" />
              <h3 className="font-medium text-sm sm:text-base">Redis unavailable</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={retryConnection}
              className="w-full sm:w-auto text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Retry Connection
            </Button>
          </div>
          <p className="text-xs sm:text-sm mt-1 text-yellow-700 dark:text-yellow-500">
            Server is running in direct processing mode (Redis unavailable). 
            Image processing will work but may be slower with multiple users.
          </p>
        </div>
      )}
      
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
              {rateLimitUsage.used > 0 && (
                <LocalRateLimitIndicator 
                  usage={rateLimitUsage.used} 
                  limit={rateLimitUsage.limit}
                  resetsIn={rateLimitUsage.resetsIn} 
                  isLimitReached={rateLimitUsage.isLimitReached}
                />
              )}
              
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
                                {(file.size / 1024).toFixed(2)} KB
                                {results[index] && results[index] !== null && (
                                  <span className="text-green-600 ml-1 sm:ml-2">
                                    → {(results[index].compressedSize / 1024).toFixed(2)} KB ({results[index].compressionRatio}% smaller)
                                  </span>
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
                                completedText: "Compressed"
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
                        <span className="font-medium">Size:</span> {(files[selectedFileIndex].size / 1024).toFixed(2)} KB
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {files[selectedFileIndex].type}
                      </p>
                    </div>
                    
                    {results[selectedFileIndex] && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-green-600 mb-2">Compressed Stats:</p>
                        <p className="mb-3">
                          Size: {(results[selectedFileIndex].compressedSize / 1024).toFixed(2)} KB 
                          <span className="text-green-600 ml-2">
                            ({results[selectedFileIndex].compressionRatio}% smaller)
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Quality setting used: {results[selectedFileIndex].qualityUsed}%
                        </p>
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
                      queueStatus,
                      toolTheme
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center text-center text-muted-foreground bg-accent/10 rounded-lg min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
                  <div>
                    <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-30" />
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
        
        {/* Compression settings and actions */}
        <Card className="p-4 sm:p-6">
          <Tabs defaultValue="single" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-lg font-medium">Compression Settings</h3>
              
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
                    Batch Compress
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Quality: {quality}%</h4>
                <Slider
                  value={[quality]}
                  onValueChange={(values: number[]) => setQuality(values[0])}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Lower quality, smaller size</span>
                  <span>Higher quality, larger size</span>
                </div>
                {/* HEIC/HEIF Detection Warning */}
                {renderHeicWarning({
                  files,
                  selectedFileIndex,
                  message: "HEIC/HEIF files are automatically converted to JPEG before compression. Original files remain unchanged."
                })}
              </div>
              
              {/* Queue Status Indicator for Single Image */}
              {selectedFileIndex !== null && 
               !results[selectedFileIndex] && 
               fileJobMapping[selectedFileIndex] && 
               queueStatus[fileJobMapping[selectedFileIndex]] && (
                <QueueStatusIndicator
                  queuePosition={queueStatus[fileJobMapping[selectedFileIndex]]?.position}
                  estimatedWaitTime={queueStatus[fileJobMapping[selectedFileIndex]]?.waitTime}
                  isProcessing={queueStatus[fileJobMapping[selectedFileIndex]]?.isProcessing}
                />
              )}
            </div>
            
            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Visual Progress Bar for Single Image */}
              {renderVisualProgress({
                selectedFileIndex,
                processingFiles,
                visualProgress,
                actionText: "Compressing image",
                toolTheme
              })}
              
              <ThemedButton 
                toolTheme={toolTheme}
                className="w-full" 
                size="lg" 
                onClick={handleCompressSingle}
                disabled={selectedFileIndex === null || (selectedFileIndex !== null && results[selectedFileIndex])}
                isLoading={isLoading}
                loadingText="Compressing..."
              >
                <Download className="mr-2 h-4 w-4" /> Compress Selected Image
              </ThemedButton>
              
              {/* Show message if already processed */}
              {selectedFileIndex !== null && results[selectedFileIndex] && !isLoading && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Image already compressed and ready for download.
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
                actionText: "Compressing",
                toolTheme
              })}
              
              <ThemedButton 
                toolTheme={toolTheme}
                className="w-full" 
                size="lg" 
                onClick={handleCompressAll}
                disabled={files.length === 0 || files.every((_, index) => results[index])}
                isLoading={isLoading}
                loadingText="Compressing..."
              >
                <Download className="mr-2 h-4 w-4" /> Compress All Images
              </ThemedButton>
              
              {/* Show message if all files are already processed */}
              {files.length > 0 && files.every((_, index) => results[index]) && !isLoading && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    All images already compressed and ready for download.
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
                  <Package className="mr-2 h-4 w-4" /> Download All as ZIP
                </ThemedButton>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
} 