import React from 'react'

interface HeicWarningProps {
  files: File[]
  selectedFileIndex: number | null
  message?: string
}

export function useHeicDetection() {
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isHeicFile = (file: File): boolean => {
    // Check for HEIC/HEIF files by extension first
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      return true;
    }
    
    // Check by MIME type
    if (file.type.includes('heic') || file.type.includes('heif')) {
      return true;
    }
    
    return false;
  }

  const getCurrentFormat = (files: File[], selectedFileIndex: number | null): string | null => {
    if (selectedFileIndex === null || !files[selectedFileIndex]) {
      return null;
    }
    
    const file = files[selectedFileIndex];
    
    // Check for HEIC/HEIF files by extension first
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.heic')) return 'heic';
    if (fileName.endsWith('.heif')) return 'heif';
    
    // Check by MIME type
    if (file.type.includes('heic')) return 'heic';
    if (file.type.includes('heif')) return 'heif';
    
    // Normalize jpeg/jpg
    const ext = getFileExtension(file.name).toLowerCase();
    if (ext === 'jpeg') return 'jpg';
    return ext;
  }

  const hasHeicFiles = (files: File[]): boolean => {
    return files.some(file => isHeicFile(file));
  }

  const renderHeicWarning = ({ 
    files, 
    selectedFileIndex, 
    message = "HEIC/HEIF files are automatically converted to JPEG before processing. Original files remain unchanged." 
  }: HeicWarningProps): React.ReactElement | null => {
    const currentFormat = getCurrentFormat(files, selectedFileIndex);
    
    if (currentFormat !== 'heic' && currentFormat !== 'heif') {
      return null;
    }

    return (
      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs text-blue-800 dark:text-blue-300">
        <p className="font-medium">HEIC/HEIF Detected</p>
        <p>{message}</p>
      </div>
    );
  }

  return {
    isHeicFile,
    getCurrentFormat,
    hasHeicFiles,
    renderHeicWarning,
    getFileExtension
  }
} 