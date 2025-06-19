import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getApiUrl } from '@/lib/apiClient';

interface ArchiveResponse {
  status: string;
  data: {
    downloadUrl: string;
  };
}

interface FileForArchive {
  filename: string;
  originalName: string;
}

interface UseArchiveDownloadProps {
  toolName: string; // e.g., "compressed", "converted", "resized"
  toolAction: string; // e.g., "compress", "convert", "resize"
  makeApiRequestWithRateLimitTracking: <T>(endpoint: string, options: any) => Promise<T>;
}

interface UseArchiveDownloadReturn {
  isArchiveLoading: boolean;
  handleDownloadArchive: (results: any[], getFileId: (result: any) => FileForArchive | null) => Promise<void>;
}

export const useArchiveDownload = ({
  toolName,
  toolAction,
  makeApiRequestWithRateLimitTracking
}: UseArchiveDownloadProps): UseArchiveDownloadReturn => {
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const { toast } = useToast();

  const handleDownloadArchive = async (
    results: any[], 
    getFileId: (result: any) => FileForArchive | null
  ) => {
    // Validate that we have processed results
    if (results.filter(r => r).length === 0) {
      toast({
        title: `No ${toolName} images`,
        description: `Please ${toolAction} at least one image first`,
        variant: "destructive"
      });
      return;
    }

    setIsArchiveLoading(true);

    try {
      // Get all file IDs that have been processed
      const fileIds = results
        .map((result) => result ? getFileId(result) : null)
        .filter(item => item !== null);



      // Use the provided API request function
      const result = await makeApiRequestWithRateLimitTracking<ArchiveResponse>('images/archive', {
        method: 'POST',
        body: { files: fileIds },
      });

      // Trigger download - use getApiUrl to ensure consistent URL format
      const baseUrl = getApiUrl().replace('/api', ''); // Remove '/api' as it's included in the downloadUrl
      window.location.href = `${baseUrl}${result.data.downloadUrl}`;

      toast({
        title: "Archive created",
        description: `Your ${toolName} images are being downloaded as a ZIP file`
      });
    } catch (error: any) {
      console.error('Archive error:', error);

      // Special handling for rate limit errors
      if (error.status === 429) {
        toast({
          title: "Rate Limit Reached",
          description: "You've reached your limit for batch operations. It will reset after some time.",
          variant: "destructive",
          duration: 5000 // Make it display longer
        });
      } else {
        toast({
          title: "Archive creation failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
      }
    } finally {
      setIsArchiveLoading(false);
    }
  };

  return {
    isArchiveLoading,
    handleDownloadArchive
  };
}; 