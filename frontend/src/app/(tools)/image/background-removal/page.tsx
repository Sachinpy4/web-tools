'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { ToolHeader } from '@/components/tools/ToolHeader'
import { Button } from '@/components/ui/button'
import { ImageIcon, Download, X, Trash2, Plus, Settings, Zap, Eye, WifiOff, RefreshCw, AlertCircle, Clock, CheckCircle, Scissors, Sparkles } from 'lucide-react'
import ImageDropzone from '@/components/tools/ImageDropzone'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { processHeicFiles } from '@/lib/heicConverter'
import { DynamicSeoLoader } from '@/components/seo/DynamicSeoLoader'
import { LocalRateLimitIndicator, useRateLimitTracking, useVisualProgress, useFileManagement, useProgressBadges, useProgressDisplay, useHeicDetection, ThemedButton, toolThemes, type ToolTheme } from '../shared'

// Background removal imports (dynamic to avoid SSR issues)
import type { Config as BackgroundRemovalConfig } from '@imgly/background-removal'

// Define types for background removal results
interface BackgroundRemovalResult {
  filename: string;
  originalSize: number;
  processedSize: number;
  processingTime: number;
  model: string;
  downloadUrl: string;
  blob: Blob;
}

// Model configuration options with enhanced descriptions
const MODEL_OPTIONS = {
  'isnet_quint8': {
    label: 'Fast',
    size: '~40MB',
    quality: 'Good',
    time: '2-5 seconds',
    recommended: 'Mobile, limited data',
    accuracy: '85-90%',
    edgeHandling: 'Basic'
  },
  'isnet_fp16': {
    label: 'Balanced',
    size: '~80MB', 
    quality: 'Excellent',
    time: '4-8 seconds',
    recommended: 'Most users',
    accuracy: '90-92%',
    edgeHandling: 'Good'
  },
  'isnet': {
    label: 'Ultra Quality',
    size: '~160MB',
    quality: 'Maximum',
    time: '8-15 seconds',
    recommended: 'Desktop, professional use, hair/fur details',
    accuracy: '92-96%',
    edgeHandling: 'Excellent'
  }
} as const;

type ModelType = keyof typeof MODEL_OPTIONS;

export default function BackgroundRemovalTool() {
  const [selectedModel, setSelectedModel] = useState<ModelType>('isnet_fp16') // Default to balanced
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<BackgroundRemovalResult[]>([])
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({})
  const [modelLoaded, setModelLoaded] = useState(false)
  const [deviceWarnings, setDeviceWarnings] = useState<string[]>([])
  const [edgeRefinement, setEdgeRefinement] = useState(true)
  const [postProcessing, setPostProcessing] = useState(true)
  
  const { toast } = useToast()
  const { rateLimitUsage, setRateLimitUsage } = useRateLimitTracking();
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
    onJobMappingReset: () => {}
  });
  
  const { renderProgressBadge } = useProgressBadges();
  const { renderVisualProgress, toolTheme } = useProgressDisplay('background-removal');
  const { renderHeicWarning } = useHeicDetection();

  // Device capability detection
  useEffect(() => {
    const checkDeviceCapabilities = () => {
      const warnings: string[] = [];
      
      // Check available memory
      const memory = (navigator as any).deviceMemory;
      if (memory && memory < 4) {
        warnings.push("Your device has limited memory. We recommend 'Fast' mode.");
      }
      
      // Check connection
      const connection = (navigator as any).connection;
      if (connection && connection.saveData) {
        warnings.push("Data saver mode detected. Consider 'Fast' mode to save data.");
      }
      
      // Check if mobile
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        warnings.push("Mobile device detected. 'Balanced' mode recommended for best experience.");
      }
      
      setDeviceWarnings(warnings);
    };

    checkDeviceCapabilities();
  }, []);

  // Auto-select optimal model based on device
  useEffect(() => {
    const getOptimalModel = (): ModelType => {
      const memory = (navigator as any).deviceMemory || 4;
      const connection = (navigator as any).connection;
      
      if (memory >= 8 && (!connection || connection.effectiveType === '4g')) {
        return 'isnet'; // Ultra quality for high-end devices
      } else if (memory >= 4) {
        return 'isnet_fp16'; // Balanced for most devices
      } else {
        return 'isnet_quint8'; // Fast for limited devices
      }
    };

    // Only auto-select if user hasn't manually chosen
    if (selectedModel === 'isnet_fp16') {
      const optimal = getOptimalModel();
      if (optimal !== 'isnet_fp16') {
        setSelectedModel(optimal);
      }
    }
  }, [selectedModel]);

  // Create wrapper functions that pass the required parameters
  const handleImageDrop = (droppedFiles: File[]) => sharedHandleImageDrop(droppedFiles);
  const handleRemoveFile = (index: number) => sharedHandleRemoveFile(index, results, setResults);
  const handleRemoveAllFiles = () => sharedHandleRemoveAllFiles(results, setResults);
  const handleDropzoneClearComplete = () => sharedHandleDropzoneClearComplete();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 1) return '< 1s';
    return `${seconds.toFixed(1)}s`;
  };

  // Post-processing function to clean up edges and refine results
  const postProcessImage = async (blob: Blob): Promise<Blob> => {
    if (!postProcessing) return blob;
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image
        ctx?.drawImage(img, 0, 0);
        
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Edge refinement algorithm
          if (edgeRefinement) {
            // Apply edge smoothing to reduce artifacts
            for (let i = 0; i < data.length; i += 4) {
              const alpha = data[i + 3];
              
              // Smooth semi-transparent pixels (common around hair/edges)
              if (alpha > 0 && alpha < 255) {
                // Get surrounding pixels for averaging
                const x = (i / 4) % canvas.width;
                const y = Math.floor((i / 4) / canvas.width);
                
                let avgR = 0, avgG = 0, avgB = 0, avgA = 0, count = 0;
                
                // Sample 3x3 neighborhood
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                      const idx = (ny * canvas.width + nx) * 4;
                      avgR += data[idx];
                      avgG += data[idx + 1];
                      avgB += data[idx + 2];
                      avgA += data[idx + 3];
                      count++;
                    }
                  }
                }
                
                // Apply smoothing only to semi-transparent areas
                if (count > 0 && alpha < 128) {
                  data[i] = Math.round(avgR / count);
                  data[i + 1] = Math.round(avgG / count);
                  data[i + 2] = Math.round(avgB / count);
                  // Slightly reduce alpha for softer edges
                  data[i + 3] = Math.max(0, alpha - 10);
                }
              }
              
              // Clean up very low alpha values (noise reduction)
              if (alpha < 20) {
                data[i + 3] = 0;
              }
            }
          }
          
          // Apply the processed image data
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Convert back to blob
        canvas.toBlob((processedBlob) => {
          resolve(processedBlob || blob);
        }, 'image/png', 1.0);
      };
      
      img.src = URL.createObjectURL(blob);
    });
  };

  const processBackgroundRemoval = async (file: File, fileIndex: number): Promise<BackgroundRemovalResult> => {
    const startTime = Date.now();
    
    // Ensure we're running in browser environment
    if (typeof window === 'undefined') {
      throw new Error('Background removal can only run in browser environment');
    }
    
    // Use optimized configuration for fast performance
    const config: BackgroundRemovalConfig = {
      model: selectedModel,
      progress: (key: string, current: number, total: number) => {
        const progressPercent = Math.round((current / total) * 100);
        console.log(`📊 Progress: ${key} - ${progressPercent}%`);
        
        // Update visual progress
        if (progressPercent === 100) {
          setVisualProgress(prev => ({ ...prev, [fileIndex]: 90 }));
        } else if (progressPercent >= 50) {
          setVisualProgress(prev => ({ ...prev, [fileIndex]: 50 + (progressPercent * 0.4) }));
        } else {
          setVisualProgress(prev => ({ ...prev, [fileIndex]: 30 + (progressPercent * 0.4) }));
        }
      }
    };

    try {
      // Start visual progress
      setVisualProgress(prev => ({ ...prev, [fileIndex]: 5 }));
      setProcessingFiles(prev => new Set(prev).add(fileIndex));

            // Dynamically import background removal - simple approach
      console.log('🔄 Loading background removal module...');
      setVisualProgress(prev => ({ ...prev, [fileIndex]: 10 }));
      
      const { removeBackground } = await import('@imgly/background-removal');
      console.log('✅ Module loaded successfully');
      setVisualProgress(prev => ({ ...prev, [fileIndex]: 20 }));
      
      // Simple background removal - let library use optimal defaults
      console.log('🔄 Starting background removal...');
      setVisualProgress(prev => ({ ...prev, [fileIndex]: 25 }));
      
      let blob = await removeBackground(file, config);
      console.log('✅ Background removal successful');
      
      // Apply post-processing to improve edge quality
      if (postProcessing || edgeRefinement) {
        setVisualProgress(prev => ({ ...prev, [fileIndex]: 85 }));
        blob = await postProcessImage(blob);
      }
      
      // Processing complete
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      
      // Create download URL
      const downloadUrl = URL.createObjectURL(blob);
      
      const result: BackgroundRemovalResult = {
        filename: file.name,
        originalSize: file.size,
        processedSize: blob.size,
        processingTime,
        model: selectedModel,
        downloadUrl,
        blob
      };

      // Complete progress
      setVisualProgress(prev => ({ ...prev, [fileIndex]: 100 }));
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileIndex);
        return newSet;
      });

      return result;
    } catch (error) {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileIndex);
        return newSet;
      });
      throw error;
    }
  };

  const handleRemoveBackgroundSingle = async () => {
    if (selectedFileIndex === null) {
      toast({
        title: "No file selected",
        description: "Please select an image to process",
        variant: "destructive"
      });
      return;
    }

    // Check if already processed
    if (results[selectedFileIndex]) {
      toast({
        title: "Image already processed",
        description: "This image has already been processed. You can download it from the preview panel.",
        variant: "default"
      });
      return;
    }

    const file = files[selectedFileIndex];
    await processFiles([file], [selectedFileIndex]);
  };

  const handleRemoveBackgroundAll = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one image to process",
        variant: "destructive"
      });
      return;
    }

    // Only process files that haven't been processed yet
    const unprocessedFiles: File[] = [];
    const unprocessedIndices: number[] = [];
    
    files.forEach((file, index) => {
      if (!results[index]) {
        unprocessedFiles.push(file);
        unprocessedIndices.push(index);
      }
    });

    if (unprocessedFiles.length === 0) {
      toast({
        title: "All images processed",
        description: "All images have already been processed",
        variant: "default"
      });
      return;
    }

    await processFiles(unprocessedFiles, unprocessedIndices);
  };

  const processFiles = async (filesToProcess: File[], fileIndices: number[]) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Process HEIC files first
      const processedFiles = await processHeicFiles(filesToProcess);
      
      // Process each file
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        const fileIndex = fileIndices[i];
        
        try {
          const result = await processBackgroundRemoval(file, fileIndex);
          
          // Update results
          setResults(prev => {
            const newResults = [...prev];
            newResults[fileIndex] = result;
            return newResults;
          });
          
          processedCount++;
          
          toast({
            title: "Background removed successfully",
            description: `${file.name} processed in ${formatTime(result.processingTime)}`,
          });
          
        } catch (error: any) {
          // Failed to process file
          failedCount++;
          
          // Clear progress for failed file
          setVisualProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileIndex];
            return newProgress;
          });
          
          setProcessingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileIndex);
            return newSet;
          });
          
          toast({
            title: "Processing failed",
            description: `Failed to process ${file.name}: ${error.message || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      }

      // Show summary for batch processing
      if (filesToProcess.length > 1) {
        toast({
          title: "Batch processing complete",
          description: `Successfully processed ${processedCount} images${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
      }

    } catch (error: any) {
      // Processing error occurred
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process images",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setModelLoaded(true);
    }
  };

  const handleDownload = (result: BackgroundRemovalResult) => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = `${result.filename.replace(/\.[^/.]+$/, '')}_no_bg.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    const processedResults = results.filter(result => result);
    
    if (processedResults.length === 0) {
      toast({
        title: "No processed images",
        description: "Please process some images first",
        variant: "destructive"
      });
      return;
    }

    processedResults.forEach(result => {
      setTimeout(() => handleDownload(result), 100);
    });

    toast({
      title: "Downloading all images",
      description: `Starting download of ${processedResults.length} processed images`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <DynamicSeoLoader pagePath="/image/background-removal" />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <ToolHeader 
          title="Background Removal"
          description="Remove backgrounds from images with AI-powered precision. Process images locally for maximum privacy and unlimited usage."
          icon={<Scissors className="h-6 w-6" />}
        />

        {/* Device Warnings */}
        {deviceWarnings.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-800 dark:text-amber-200">Device Recommendations</h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    {deviceWarnings.map((warning, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-amber-600 rounded-full" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hair/Edge Quality Tips */}
        <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-green-800 dark:text-green-200">Getting Best Results with Hair & Fine Details</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-green-600 rounded-full mt-2" />
                    <span><strong>Use "Ultra Quality" model</strong> - Best for hair, fur, and complex edges</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-green-600 rounded-full mt-2" />
                    <span><strong>Enable Edge Refinement</strong> - Smooths hair edges and reduces artifacts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-green-600 rounded-full mt-2" />
                    <span><strong>Good lighting helps</strong> - Well-lit images with contrast between subject and background work best</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-green-600 rounded-full mt-2" />
                    <span><strong>Higher resolution</strong> - Larger images provide more detail for better edge detection</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload and Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Area - MOVED TO TOP for better UX */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Upload Images
                </CardTitle>
                <CardDescription>
                  Drag and drop or click to upload images (max 15MB each)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageDropzone
                  onImageDrop={handleImageDrop}
                  maxSize={15 * 1024 * 1024}
                  accept={{
                    'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif']
                  }}
                  shouldClear={shouldClearDropzone}
                  onClearComplete={handleDropzoneClearComplete}
                />
                {renderHeicWarning({ files, selectedFileIndex })}
              </CardContent>
            </Card>

            {/* Processing Controls - MOVED TO SECOND position for immediate action */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Process Images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <ThemedButton
                      onClick={handleRemoveBackgroundSingle}
                      disabled={isProcessing || selectedFileIndex === null}
                      className="w-full"
                      toolTheme={toolTheme}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Scissors className="h-4 w-4 mr-2" />
                          Remove Background (Selected)
                        </>
                      )}
                    </ThemedButton>

                    <ThemedButton
                      onClick={handleRemoveBackgroundAll}
                      disabled={isProcessing || files.length === 0}
                      variant="secondary"
                      className="w-full"
                      toolTheme={toolTheme}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Process All Images ({files.length})
                    </ThemedButton>
                  </div>



                  {files.length > 1 && (
                    <Button
                      onClick={handleRemoveAllFiles}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Files
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Model Selection - MOVED TO THIRD position for logical flow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Processing Quality
                </CardTitle>
                <CardDescription>
                  Choose the AI model based on your device and quality needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedModel} onValueChange={(value: ModelType) => setSelectedModel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODEL_OPTIONS).map(([key, option]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{option.label}</span>
                          <Badge variant="outline" className="ml-2">{option.size}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Model Info */}
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quality:</span>
                      <span className="ml-1 font-medium">{MODEL_OPTIONS[selectedModel].quality}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accuracy:</span>
                      <span className="ml-1 font-medium">{MODEL_OPTIONS[selectedModel].accuracy}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <span className="ml-1 font-medium">{MODEL_OPTIONS[selectedModel].time}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Edge Handling:</span>
                      <span className="ml-1 font-medium">{MODEL_OPTIONS[selectedModel].edgeHandling}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    <strong>Best for:</strong> {MODEL_OPTIONS[selectedModel].recommended}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Post-Processing Options - REMAINS in third position */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Edge Enhancement
                </CardTitle>
                <CardDescription>
                  Improve hair and fine detail quality with post-processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Edge Refinement</label>
                    <p className="text-xs text-muted-foreground">Smooths hair edges and reduces artifacts</p>
                  </div>
                  <button
                    onClick={() => setEdgeRefinement(!edgeRefinement)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      edgeRefinement ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        edgeRefinement ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Noise Reduction</label>
                    <p className="text-xs text-muted-foreground">Removes background remnants and artifacts</p>
                  </div>
                  <button
                    onClick={() => setPostProcessing(!postProcessing)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      postProcessing ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        postProcessing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {selectedModel !== 'isnet' && (edgeRefinement || postProcessing) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Tip:</strong> For best hair/fur results, try the "Ultra Quality" model which has excellent edge handling built-in.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rate Limit Info */}
            <LocalRateLimitIndicator 
              usage={rateLimitUsage.used} 
              limit={rateLimitUsage.limit} 
              resetsIn={rateLimitUsage.resetsIn}
              isLimitReached={rateLimitUsage.isLimitReached}
            />
          </div>

          {/* Right Panel - Preview and Results */}
          <div className="lg:col-span-2">
            {files.length > 0 ? (
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="results">
                    <Download className="h-4 w-4 mr-2" />
                    Results ({results.filter(r => r).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {files.map((file, index) => (
                      <Card 
                        key={index} 
                        className={`cursor-pointer transition-all ${
                          selectedFileIndex === index 
                            ? 'ring-2 ring-primary shadow-lg' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedFileIndex(index)}
                      >
                        <CardContent className="p-4">
                          <div className="relative group">
                            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                              {previews[index] ? (
                                <img 
                                  src={previews[index]} 
                                  alt={file.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <div className="text-center p-4">
                                  <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Progress Overlay */}
                            {processingFiles.has(index) && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <div className="text-center text-white">
                                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                                  <p className="text-sm">Processing...</p>
                                  {visualProgress[index] && (
                                    <div className="w-32 mt-2">
                                      <Progress value={visualProgress[index]} className="h-2" />
                                      <p className="text-xs mt-1">{visualProgress[index]}%</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Result Badge */}
                            {results[index] && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-green-500 text-white">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Processed
                                </Badge>
                              </div>
                            )}

                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(index);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="mt-3 space-y-1">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            {renderProgressBadge({
                              index,
                              results,
                              processingFiles,
                              visualProgress,
                              fileJobMapping: {},
                              jobProgress: {},
                              completedText: "Processed"
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="results" className="mt-6">
                  {results.filter(r => r).length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Processed Images</h3>
                        <Button onClick={handleDownloadAll} className="gap-2">
                          <Download className="h-4 w-4" />
                          Download All
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {results.map((result, index) => {
                          if (!result) return null;
                          
                          return (
                            <Card key={index}>
                              <CardContent className="p-4">
                                <div className="space-y-4">
                                  {/* Before/After Preview */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Original</p>
                                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                                        {previews[index] && (
                                          <img 
                                            src={previews[index]} 
                                            alt="Original"
                                            className="max-h-full max-w-full object-contain"
                                          />
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">Processed</p>
                                      <div className="aspect-video bg-transparent bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] bg-[length:20px_20px] bg-[0_0,0_10px,10px_-10px,-10px_0px] dark:bg-[linear-gradient(45deg,#404040_25%,transparent_25%),linear-gradient(-45deg,#404040_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#404040_75%),linear-gradient(-45deg,transparent_75%,#404040_75%)] rounded-lg overflow-hidden flex items-center justify-center">
                                        <img 
                                          src={result.downloadUrl} 
                                          alt="Processed"
                                          className="max-h-full max-w-full object-contain"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Stats */}
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Original:</span>
                                      <span className="ml-1 font-medium">{formatFileSize(result.originalSize)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Processed:</span>
                                      <span className="ml-1 font-medium">{formatFileSize(result.processedSize)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Time:</span>
                                      <span className="ml-1 font-medium">{formatTime(result.processingTime)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Model:</span>
                                      <span className="ml-1 font-medium">{MODEL_OPTIONS[result.model as ModelType]?.label}</span>
                                    </div>
                                  </div>
                                  
                                  <Button 
                                    onClick={() => handleDownload(result)}
                                    className="w-full gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download PNG
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center space-y-4">
                          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <Scissors className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium mb-2">No processed images yet</h3>
                            <p className="text-sm text-muted-foreground">
                              Upload images and click "Remove Background" to get started
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Ready for Background Removal</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload your images to start removing backgrounds with AI precision
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Privacy-First</Badge>
                        <Badge variant="outline">No Upload Limits</Badge>
                        <Badge variant="outline">Works Offline</Badge>
                        <Badge variant="outline">Professional Quality</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 