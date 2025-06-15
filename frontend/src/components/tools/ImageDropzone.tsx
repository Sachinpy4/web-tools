'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { useToast } from '@/components/ui/use-toast'
import { getFileUploadSettings } from '@/lib/api/statusApi'

interface ImageDropzoneProps {
  onImageDrop: (files: File[]) => void
  maxFiles?: number
  maxSize?: number
  accept?: Record<string, string[]>
  existingFiles?: number
  shouldClear?: boolean
  onClearComplete?: () => void
  showFileList?: boolean
}

export default function ImageDropzone({
  onImageDrop,
  maxFiles: propMaxFiles,
  maxSize: propMaxSize,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.svg', '.heic', '.heif']
  },
  existingFiles = 0,
  shouldClear = false,
  onClearComplete,
  showFileList = false
}: ImageDropzoneProps) {
  const [files, setFiles] = useState<File[]>([])
  const [fileRejections, setFileRejections] = useState<FileRejection[]>([])
  const [maxFiles, setMaxFiles] = useState(propMaxFiles || 10)
  const [maxSize, setMaxSize] = useState(propMaxSize || 52428800) // 50MB default
  const { toast } = useToast()
  
  // Handle clearing from parent component
  useEffect(() => {
    if (shouldClear) {
      setFiles([])
      setFileRejections([])
      if (onClearComplete) {
        onClearComplete()
      }
    }
  }, [shouldClear, onClearComplete])
  
  // Fetch dynamic file upload settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getFileUploadSettings();
        
        // Only update if no props were provided (to allow prop overrides)
        if (!propMaxFiles) {
          setMaxFiles(settings.maxFiles);
        }
        if (!propMaxSize) {
          setMaxSize(settings.maxFileSize);
        }
      } catch (error) {
        console.warn('Failed to fetch file upload settings, using defaults:', error);
        // Keep defaults
      }
    };

    fetchSettings();
  }, [propMaxFiles, propMaxSize]);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if adding these files would exceed the total limit
    if (existingFiles + acceptedFiles.length > maxFiles) {
      // Calculate how many more files can be added
      const remainingSlots = Math.max(0, maxFiles - existingFiles);
      
      // Truncate the accepted files to only include what fits
      const fittingFiles = acceptedFiles.slice(0, remainingSlots);
      
      // Create rejections for the files that don't fit
      const excessFiles = acceptedFiles.slice(remainingSlots);
      const excessRejections = excessFiles.map(file => ({
        file,
        errors: [{
          code: 'too-many-files',
          message: `File limit exceeded. Maximum of ${maxFiles} files allowed.`
        }]
      })) as FileRejection[];
      
      // Only update internal state if showFileList is true
      if (showFileList) {
        setFiles(fittingFiles);
      }
      
      if (fittingFiles.length > 0) {
        onImageDrop(fittingFiles);
      }
      
      // Handle the rejections for excess files
      if (excessRejections.length > 0) {
        setFileRejections(excessRejections);
        toast({
          title: "File limit exceeded",
          description: `You can only upload a maximum of ${maxFiles} files. ${excessRejections.length} file(s) were not added.`,
          variant: "destructive"
        });
      }
    } else {
      // All files fit within the limit
      if (showFileList) {
        setFiles(acceptedFiles);
      }
      onImageDrop(acceptedFiles);
      // Clear previous rejections when new files are successfully dropped
      setFileRejections([]);
    }
  }, [onImageDrop, existingFiles, maxFiles, toast, showFileList]);
  
  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    // Store rejections for UI display
    setFileRejections(rejections);
    
    // Group rejections by error code
    const tooLargeFiles = rejections.filter(({ errors }) => 
      errors.some(e => e.code === 'file-too-large')
    );
    
    const tooManyFiles = rejections.filter(({ errors }) => 
      errors.some(e => e.code === 'too-many-files')
    );
    
    const invalidTypeFiles = rejections.filter(({ errors }) => 
      errors.some(e => e.code === 'file-invalid-type')
    );
    
    // Show appropriate toast messages with more professional wording
    if (tooLargeFiles.length > 0) {
      toast({
        title: "File size limit exceeded",
        description: `${tooLargeFiles.length} file(s) exceed the ${maxSize / (1024 * 1024)}MB size limit and were not uploaded.`,
        variant: "destructive"
      });
    }
    
    if (tooManyFiles.length > 0) {
      toast({
        title: "File limit exceeded",
        description: `You can only upload a maximum of ${maxFiles} files. Please reduce the number of files and try again.`,
        variant: "destructive"
      });
    }
    
    if (invalidTypeFiles.length > 0) {
      toast({
        title: "Unsupported file format",
        description: `${invalidTypeFiles.length} file(s) have unsupported formats. Please use JPEG, PNG, GIF, SVG, or HEIC formats only.`,
        variant: "destructive"
      });
    }
  }, [toast, maxSize, maxFiles]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    onDropRejected,
    maxFiles,
    maxSize,
    accept,
    multiple: true,
    preventDropOnDocument: true,
    noClick: false,
    noKeyboard: false,
    useFsAccessApi: true, // Use File System Access API for better file selection (when available)
    // Custom error messages
    validator: (file) => {
      if (file.size > maxSize) {
        return {
          code: 'file-too-large',
          message: `File size exceeds the ${maxSize / (1024 * 1024)}MB limit.`
        };
      }
      // Let the built-in validators handle other errors
      return null;
    }
  })
  
  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
        ${existingFiles >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} disabled={existingFiles >= maxFiles} />
      
      {existingFiles >= maxFiles ? (
        <div>
          <p className="text-lg mb-2 text-amber-700 dark:text-amber-400">Maximum file limit reached</p>
          <p className="text-sm text-muted-foreground">
            Please remove some files before adding more.
          </p>
        </div>
      ) : isDragActive ? (
        <p className="text-lg">Drop the images here...</p>
      ) : (
        <div>
          <p className="text-lg mb-2">Drag & drop images here, or click to select files</p>
          <p className="text-sm text-muted-foreground">
            (Max {maxFiles} files, up to {maxSize / (1024 * 1024)}MB each)
          </p>
          {existingFiles > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {existingFiles} of {maxFiles} files used. You can add {maxFiles - existingFiles} more.
            </p>
          )}
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Now supporting HEIC/HEIF (iPhone) images!
          </p>
        </div>
      )}
      
      {/* Only show file list if explicitly requested */}
      {showFileList && files.length > 0 && (
        <div className="mt-4">
          <p className="font-medium">{files.length} file(s) selected</p>
          <ul className="mt-2 text-sm text-left">
            {files.map((file, index) => (
              <li key={index} className="truncate max-w-full">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {fileRejections.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="font-medium text-red-700 dark:text-red-400">Unable to add the following files:</p>
          <ul className="mt-2 text-sm text-left text-red-600 dark:text-red-400">
            {fileRejections.map(({ file, errors }, index) => (
              <li key={index} className="mb-1 flex items-start">
                <span className="inline-block mt-0.5 mr-1.5">⚠️</span>
                <span>
                  <span className="font-medium">{file.name}</span> - {errors[0].message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
} 