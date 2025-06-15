'use client'

import React, { useState, useEffect } from 'react'
import { ToolHeader } from '@/components/tools/ToolHeader'
import { Button } from '@/components/ui/button'
import { 
  Repeat, Download, X, Trash2, FileType, ImageIcon, Plus, Package, 
  ArrowDownSquare, ArrowRightSquare, RefreshCw, CheckCircle, Server
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
import { processHeicFiles } from '@/lib/heicConverter'

import { apiRequest, getApiUrl } from '@/lib/apiClient'

import { QueueStatusIndicator } from '@/components/ui/QueueStatusIndicator'
import { useProcessingMode } from '@/lib/context/ProcessingModeContext'
import { DynamicSeoLoader } from '@/components/seo/DynamicSeoLoader'
import { LocalRateLimitIndicator, useRateLimitTracking, useVisualProgress, useFileManagement, useApiWithRateLimit, useJobManagement, useArchiveDownload, useProgressBadges, useProgressDisplay, useHeicDetection, ThemedButton, toolThemes, type ToolTheme } from '../shared'

// Define response types for API calls
interface ConvertResponse {
  status: string;
  data: {
    originalFormat: string;
    convertedFormat: string;
    mime: string;
    filename: string;
    originalFilename: string;
    downloadUrl: string;
  } | {
    jobId: string;
    statusUrl: string;
  };
}

export default function ConvertTool() {

  const [targetFormat, setTargetFormat] = useState<string>('webp')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  


  
  const { toast } = useToast()
  const { processingMode } = useProcessingMode()

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
    toolName: "converted",
    toolAction: "convert",
    makeApiRequestWithRateLimitTracking
  });
  
  const { renderProgressBadge } = useProgressBadges();
  const { renderBackgroundJobProgress, renderVisualProgress, renderBatchProgress, toolTheme } = useProgressDisplay('convert');
  const { getCurrentFormat, renderHeicWarning } = useHeicDetection();
  
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
  
  // Result processor for convert jobs
  const createConvertResult = (jobResult: any, file: File) => {
    const newFilename = `${getFileNameWithoutExtension(file.name)}.${targetFormat}`;
    return {
      filename: file.name,
      originalFormat: jobResult.originalFormat,
      convertedFormat: jobResult.convertedFormat,
      mime: jobResult.mime,
      resultFilename: jobResult.filename,
      newFilename: newFilename,
      downloadUrl: jobResult.downloadUrl
    };
  };
  
  // Update target format when selected file changes
  useEffect(() => {
    if (selectedFileIndex !== null && files[selectedFileIndex]) {
      const currentFormat = getCurrentFormat(files, selectedFileIndex)
      
      // If current target format is the same as the file's format, select a different one
      if (currentFormat === targetFormat) {
        // Default to webp if current is not webp, otherwise use png
        setTargetFormat(currentFormat === 'webp' ? 'png' : 'webp')
      }
    }
  }, [selectedFileIndex, files])
  
  // Create wrapper functions that pass the required parameters
  const handleImageDrop = (droppedFiles: File[]) => sharedHandleImageDrop(droppedFiles);
  const handleRemoveFile = (index: number) => sharedHandleRemoveFile(index, results, setResults);
  const handleRemoveAllFiles = () => sharedHandleRemoveAllFiles(results, setResults);
  const handleDropzoneClearComplete = () => sharedHandleDropzoneClearComplete();
  
  // Function to get file extension from a filename
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }
  
  // Function to get file name without extension
  const getFileNameWithoutExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.')
    return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename
  }
  
  // Get the current format of the selected file

  
  const handleConvertSingle = async () => {
    if (selectedFileIndex === null) {
      toast({
        title: "No file selected",
        description: "Please select an image to convert",
        variant: "destructive"
      })
      return
    }
    
    // Check if file is already converted
    if (results[selectedFileIndex]) {
      toast({
        title: "Image already converted",
        description: "This image has already been converted. You can download it from the preview panel.",
        variant: "default"
      })
      return
    }
    
    const file = files[selectedFileIndex]
    await convertFiles([file], [selectedFileIndex])
  }
  
  const handleConvertAll = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one image to convert",
        variant: "destructive"
      })
      return
    }
    
    // Filter out already converted files
    const unconvertedFiles: File[] = []
    const unconvertedIndices: number[] = []
    
    files.forEach((file, index) => {
      if (!results[index]) {
        unconvertedFiles.push(file)
        unconvertedIndices.push(index)
      }
    })
    
    if (unconvertedFiles.length === 0) {
      toast({
        title: "All images already converted",
        description: "All images have already been converted. You can download them using the ZIP download button.",
        variant: "default"
      })
      return
    }
    
    await convertFiles(unconvertedFiles, unconvertedIndices)
  }
  
  const convertFiles = async (filesToConvert: File[], fileIndices: number[]) => {
    setIsLoading(true);
    const convertedResults: any[] = [...results];
    
    // Mark files as being processed and start visual progress
    setProcessingFiles(new Set(fileIndices))
    
    try {
      for (let i = 0; i < filesToConvert.length; i++) {
        const file = filesToConvert[i];
        const index = fileIndices[i];
        
        // Start visual progress for this file
        setVisualProgress(prev => ({
          ...prev,
          [index]: 0
        }));
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('format', targetFormat);
        
        try {
          // Use makeApiRequestWithRateLimitTracking instead of makeRequest
          const result = await makeApiRequestWithRateLimitTracking<ConvertResponse>('images/convert', {
            method: 'POST',
            body: formData,
            isFormData: true,
          });
          
          // Create the new filename with the target extension
          const newFilename = `${getFileNameWithoutExtension(file.name)}.${targetFormat}`;
          
          // Check if this is a direct response or a job that needs polling
          if (result.status === 'success' && 'convertedFormat' in result.data) {
            // Direct processing - use visual progress
            const resultData = result.data as {
              originalFormat: string;
              convertedFormat: string;
              mime: string;
              filename: string;
              originalFilename: string;
              downloadUrl: string;
            };
            
            const resultObj = createConvertResult(resultData, file);
            
            // Start visual progress simulation for direct processing
            showResultsAfterProgress(index, resultObj).then(() => {
              // Show success notification after progress completes
              toast({
                title: "✅ Conversion completed!",
                description: `${file.name} converted to ${resultData.convertedFormat.toUpperCase()}`,
              });
            });
          } else if (result.status === 'processing' && 'jobId' in result.data) {
            // Background processing - use shared job polling
            const jobId = result.data.jobId;
            startJobPolling(jobId, 'convert', index, file, createConvertResult);
          }
        } catch (error: any) {
          console.error(`Failed to convert file ${i+1}/${filesToConvert.length}:`, error);
          
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
            convertedResults[index] = null;
            
            // Stop processing more files if we hit a rate limit
            break;
          } else {
            // For other errors, just continue to the next file
            toast({
              title: `Failed to convert file ${i+1}/${filesToConvert.length}`,
              description: error.message || "An unexpected error occurred",
              variant: "destructive"
            });
            
            // Mark the file as failed
            convertedResults[index] = null;
          }
          
          // Continue with other files instead of stopping the whole batch
          continue;
        }
      }
      
      // Update results for direct processing (this is handled by showResultsAfterProgress now)
      // setResults(convertedResults);
      
      // Only show success toast if we're not waiting for background jobs
      // (Individual success toasts are now shown after progress completes)
      
    } catch (error) {
      console.error('Conversion error:', error);
      
      // Clean up all progress states on major error
      setVisualProgress({});
      setProcessingFiles(new Set());
      setFileJobMapping({});
      
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      // Only set loading to false if we're not waiting for background jobs
      if (jobIds.length === 0) {
        setIsLoading(false);
      }
    }
  }
  
  const handleDownloadArchive = () => {
    sharedHandleDownloadArchive(results, (result) => ({
      filename: result.resultFilename,
      originalName: result.newFilename
    }));
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <DynamicSeoLoader pagePath="/image/convert" />
      <ToolHeader 
        title="Image Converter" 
        description="Convert your images between different formats while maintaining quality."
        icon={<Repeat className="h-6 w-6" />}
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
                                  <span>{results[index].originalFormat.toUpperCase()} → {results[index].convertedFormat.toUpperCase()}</span>
                                ) : (
                                  <span>Format: {getFileExtension(file.name).toUpperCase()}</span>
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
                                completedText: "Converted"
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
                        <span className="font-medium">Current Format:</span> {getFileExtension(files[selectedFileIndex].name).toUpperCase()}
                      </p>
                    </div>
                    
                    {results[selectedFileIndex] && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-green-600 mb-2">Conversion Results:</p>
                        <p className="mb-3">New format: {results[selectedFileIndex].convertedFormat.toUpperCase()}</p>
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
                    <Repeat className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-30" />
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
        
        {/* Convert settings and actions */}
        <Card className="p-4 sm:p-6">
          <Tabs defaultValue="single" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-lg font-medium">Conversion Settings</h3>
              
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
                    Batch Convert
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <div className="grid gap-4 sm:gap-6">
              {/* Format Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Target Format</label>
                <Select 
                  value={targetFormat} 
                  onValueChange={setTargetFormat}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentFormat(files, selectedFileIndex) !== 'webp' && (
                      <SelectItem value="webp">WebP (Best overall)</SelectItem>
                    )}
                    {getCurrentFormat(files, selectedFileIndex) !== 'jpg' && (
                      <SelectItem value="jpg">JPEG (Photos)</SelectItem>
                    )}
                    {getCurrentFormat(files, selectedFileIndex) !== 'png' && (
                      <SelectItem value="png">PNG (Transparency)</SelectItem>
                    )}
                    {getCurrentFormat(files, selectedFileIndex) !== 'avif' && (
                      <SelectItem value="avif">AVIF (Smallest size)</SelectItem>
                    )}
                    {getCurrentFormat(files, selectedFileIndex) !== 'tiff' && (
                      <SelectItem value="tiff">TIFF (Print quality)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {targetFormat === 'webp' && "WebP offers excellent compression and quality balance, supports transparency, and works on most modern browsers."}
                  {targetFormat === 'jpg' && "JPEG is best for photographs and has universal support, but doesn't support transparency."}
                  {targetFormat === 'png' && "PNG supports transparency and lossless compression, ideal for graphics and screenshots."}
                  {targetFormat === 'avif' && "AVIF provides the smallest file sizes with high quality, but has limited compatibility with older browsers."}
                  {targetFormat === 'tiff' && "TIFF offers the highest quality for printing and professional editing, but creates larger files."}
                </p>
                {/* HEIC/HEIF Detection Warning */}
                {renderHeicWarning({
                  files,
                  selectedFileIndex,
                  message: "HEIC/HEIF files are automatically converted to JPEG before processing. Original files remain unchanged."
                })}
              </div>
              

              
              {/* Format Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm border-t pt-4">
                <div>
                  <h4 className="font-medium mb-3">Best For</h4>
                  <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                    {targetFormat === 'webp' && (
                      <>
                        <li>Web images</li>
                        <li>Photos with transparency</li>
                        <li>Balancing quality and size</li>
                      </>
                    )}
                    {targetFormat === 'jpg' && (
                      <>
                        <li>Photographs</li>
                        <li>Complex images</li>
                        <li>Universal support</li>
                      </>
                    )}
                    {targetFormat === 'png' && (
                      <>
                        <li>Graphics with transparency</li>
                        <li>Screenshots</li>
                        <li>Logos and icons</li>
                      </>
                    )}
                    {targetFormat === 'avif' && (
                      <>
                        <li>Modern websites</li>
                        <li>Maximum compression</li>
                        <li>High-quality photos</li>
                      </>
                    )}
                    {targetFormat === 'tiff' && (
                      <>
                        <li>Print materials</li>
                        <li>Professional editing</li>
                        <li>Archival purposes</li>
                      </>
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Limitations</h4>
                  <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                    {targetFormat === 'webp' && (
                      <>
                        <li>Limited support in older browsers</li>
                        <li>Some quality loss compared to PNG</li>
                      </>
                    )}
                    {targetFormat === 'jpg' && (
                      <>
                        <li>No transparency support</li>
                        <li>Lossy compression</li>
                        <li>Not ideal for text or graphics</li>
                      </>
                    )}
                    {targetFormat === 'png' && (
                      <>
                        <li>Larger file sizes</li>
                        <li>Not ideal for photographs</li>
                      </>
                    )}
                    {targetFormat === 'avif' && (
                      <>
                        <li>Limited browser support</li>
                        <li>Slower encoding</li>
                        <li>Not widely supported in software</li>
                      </>
                    )}
                    {targetFormat === 'tiff' && (
                      <>
                        <li>Very large file sizes</li>
                        <li>Not supported by web browsers</li>
                        <li>Limited compatibility</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            
            <TabsContent value="single" className="space-y-4 mt-4">
              {/* Visual Progress Bar for Single Image */}
              {renderVisualProgress({
                selectedFileIndex,
                processingFiles,
                visualProgress,
                actionText: "Converting image",
                toolTheme
              })}
              
              <ThemedButton 
                toolTheme={toolTheme}
                className="w-full" 
                size="lg" 
                onClick={handleConvertSingle}
                disabled={selectedFileIndex === null || (selectedFileIndex !== null && results[selectedFileIndex])}
                isLoading={isLoading}
                loadingText="Converting..."
              >
                <Repeat className="mr-2 h-4 w-4" /> Convert Selected Image
              </ThemedButton>
              
              {/* Show message if already processed */}
              {selectedFileIndex !== null && results[selectedFileIndex] && !isLoading && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Image already converted and ready for download.
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
                actionText: "Converting",
                toolTheme
              })}
              
              <ThemedButton 
                toolTheme={toolTheme}
                className="w-full" 
                size="lg" 
                onClick={handleConvertAll}
                disabled={files.length === 0 || files.every((_, index) => results[index])}
                isLoading={isLoading}
                loadingText="Converting..."
              >
                <Repeat className="mr-2 h-4 w-4" /> Convert All Images
              </ThemedButton>
              
              {/* Show message if all files are already processed */}
              {files.length > 0 && files.every((_, index) => results[index]) && !isLoading && (
                <div className="text-center text-sm text-muted-foreground">
                  <p className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    All images already converted and ready for download.
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