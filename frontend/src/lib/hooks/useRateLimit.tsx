import { useState } from 'react';
import { apiRequest } from '@/lib/apiClient';
import { toast } from '@/components/ui/use-toast';

export interface RateLimitInfo {
  used: number;
  limit: number;
  resetsIn: number | null;
}

export function useRateLimit(initialLimit: number = 10) {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    used: 0,
    limit: initialLimit,
    resetsIn: null
  });

  // Update rate limit info from headers
  const updateRateLimitInfo = (headers: Headers) => {
    const remaining = headers.get('RateLimit-Remaining');
    const limit = headers.get('RateLimit-Limit');
    const resetAfter = headers.get('RateLimit-Reset-After');
    
    if (remaining && limit) {
      const used = Number(limit) - Number(remaining);
      setRateLimitInfo(prev => ({
        ...prev,
        used,
        limit: Number(limit),
        resetsIn: resetAfter ? Number(resetAfter) : null
      }));
    }
  };

  // Enhanced API request function that tracks rate limits
  const makeRequest = async <T,>(endpoint: string, options: any = {}): Promise<T> => {
    try {
      // Make the actual API request
      const result = await apiRequest<T>(endpoint, options);
      return result;
    } catch (error: any) {
      // Handle rate limit errors
      if (error.status === 429) {
        toast({
          title: "Rate Limit Reached",
          description: "You've reached your limit for image processing. It will reset after some time.",
          variant: "destructive"
        });
        
        // Update rate limit info if available
        if (error.rateLimitInfo) {
          const { limit, remaining, resetAfter } = error.rateLimitInfo;
          if (limit && remaining) {
            const used = Number(limit) - Number(remaining);
            setRateLimitInfo({
              used,
              limit: Number(limit),
              resetsIn: resetAfter ? Number(resetAfter) : null
            });
          }
        }
      }
      
      throw error; // Re-throw the error for the caller to handle
    }
  };

  return {
    rateLimitInfo,
    makeRequest,
    updateRateLimitInfo
  };
}

// Reusable rate limit indicator component
export const RateLimitIndicator = ({ 
  usage, 
  limit, 
  resetsIn 
}: { 
  usage: number; 
  limit: number; 
  resetsIn: number | null 
}) => {
  // Calculate percentage used
  const percentUsed = Math.min(100, Math.round((usage / limit) * 100));
  
  // Determine indicator color based on usage
  let indicatorColor = "bg-green-500";
  if (percentUsed > 70) indicatorColor = "bg-yellow-500";
  if (percentUsed > 90) indicatorColor = "bg-red-500";
  
  // Don't render if no usage yet
  if (usage === 0) return null;
  
  return (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm font-medium">API Rate Limit</h4>
        <span className="text-xs">{usage} of {limit} requests used</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        <div
          className={`h-full ${indicatorColor} transition-all duration-300`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      {resetsIn !== null && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Rate limit resets in {Math.ceil(resetsIn / 60)} minutes
        </p>
      )}
    </div>
  );
}; 