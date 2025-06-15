import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { processHeicFiles } from '@/lib/heicConverter';

interface UseFileManagementProps {
  clearAllProgress: () => void;
  adjustProgressIndices: (removedIndex: number) => void;
  onFilesChange?: (files: File[]) => void;
  onResultsReset?: () => void;
  onJobMappingReset?: () => void;
}

interface UseFileManagementReturn {
  // State
  files: File[];
  previews: string[];
  selectedFileIndex: number | null;
  shouldClearDropzone: boolean;
  
  // Setters for external use
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setPreviews: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFileIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setShouldClearDropzone: React.Dispatch<React.SetStateAction<boolean>>;
  
  // File management functions
  handleImageDrop: (droppedFiles: File[]) => Promise<void>;
  handleRemoveFile: (index: number, results: any[], setResults: React.Dispatch<React.SetStateAction<any[]>>) => void;
  handleRemoveAllFiles: (results: any[], setResults: React.Dispatch<React.SetStateAction<any[]>>) => void;
  handleDropzoneClearComplete: () => void;
}

export const useFileManagement = ({
  clearAllProgress,
  adjustProgressIndices,
  onFilesChange,
  onResultsReset,
  onJobMappingReset
}: UseFileManagementProps): UseFileManagementReturn => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [shouldClearDropzone, setShouldClearDropzone] = useState(false);
  
  const { toast } = useToast();

  // Generate preview URLs when files change
  useEffect(() => {
    // Revoke old object URLs to avoid memory leaks
    previews.forEach(preview => URL.revokeObjectURL(preview));
    
    // Create new preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    
    // Notify parent of files change
    onFilesChange?.(files);
    
    // Clean up function to revoke URLs when component unmounts
    return () => {
      newPreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [files, onFilesChange]);

  const handleImageDrop = async (droppedFiles: File[]) => {
    // First convert any HEIC/HEIF files to JPEG
    try {
      const processedFiles = await processHeicFiles(droppedFiles);
      
      // ImageDropzone now handles file limits dynamically, so we just add all processed files
      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...processedFiles];
        // Automatically select the first file if none is currently selected
        if (selectedFileIndex === null && updatedFiles.length > 0) {
          setTimeout(() => setSelectedFileIndex(0), 0);
        }
        return updatedFiles;
      });
      
      // Reset results and progress states when new files are uploaded
      onResultsReset?.();
      clearAllProgress();
    } catch (error) {
      toast({
        title: "Error processing HEIC images",
        description: "There was an error processing one or more HEIC images. Try converting them to JPEG before uploading.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFile = (
    index: number, 
    results: any[], 
    setResults: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    // Also remove from results if it was already processed
    setResults(prevResults => prevResults.filter((_, i) => i !== index));
    
    // Clean up progress states for this file using shared hook
    adjustProgressIndices(index);
    
    if (selectedFileIndex === index) {
      setSelectedFileIndex(null);
    } else if (selectedFileIndex !== null && selectedFileIndex > index) {
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  };

  const handleRemoveAllFiles = (
    results: any[], 
    setResults: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    setFiles([]);
    setPreviews([]);
    setResults([]);
    setSelectedFileIndex(null);
    // Clean up all progress states
    clearAllProgress();
    onJobMappingReset?.();
    // Trigger dropzone clearing
    setShouldClearDropzone(true);
  };

  // Callback for when dropzone completes clearing
  const handleDropzoneClearComplete = () => {
    setShouldClearDropzone(false);
  };

  return {
    // State
    files,
    previews,
    selectedFileIndex,
    shouldClearDropzone,
    
    // Setters
    setFiles,
    setPreviews,
    setSelectedFileIndex,
    setShouldClearDropzone,
    
    // Functions
    handleImageDrop,
    handleRemoveFile,
    handleRemoveAllFiles,
    handleDropzoneClearComplete
  };
}; 