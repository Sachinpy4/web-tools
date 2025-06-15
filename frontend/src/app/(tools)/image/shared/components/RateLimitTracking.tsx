import React from 'react';
import { RateLimitUsage } from '../types';

interface LocalRateLimitIndicatorProps {
  usage: number;
  limit: number;
  resetsIn: number | null;
  isLimitReached?: boolean;
}

/**
 * Local Rate Limit Indicator - Simple version for tools that have local implementations
 * This maintains the exact styling and functionality of the duplicated local components
 */
export const LocalRateLimitIndicator: React.FC<LocalRateLimitIndicatorProps> = ({ 
  usage, 
  limit, 
  resetsIn, 
  isLimitReached = false 
}) => {
  // Calculate percentage used
  const percentUsed = Math.min(100, Math.round((usage / limit) * 100));
  
  // Determine indicator color based on usage
  let indicatorColor = "bg-green-500";
  if (percentUsed > 70) indicatorColor = "bg-yellow-500";
  if (percentUsed > 90 || isLimitReached) indicatorColor = "bg-red-500";
  
  // Only hide if no usage and not limit reached
  if (usage === 0 && !isLimitReached) return null;
  
  return (
    <div className={`mt-4 p-3 ${isLimitReached ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'} border rounded-md`}>
      <div className="flex justify-between items-center mb-1">
        <h4 className={`text-sm font-medium ${isLimitReached ? 'text-red-700 dark:text-red-400' : ''}`}>
          {isLimitReached ? 'Rate Limit Reached' : 'API Rate Limit'}
        </h4>
        <span className="text-xs">{usage} of {limit} requests used</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        <div
          className={`h-full ${indicatorColor} transition-all duration-300`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      {resetsIn !== null && (
        <p className={`mt-1 text-xs ${isLimitReached ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          Rate limit resets in {Math.ceil(resetsIn / 60)} minutes
        </p>
      )}
      {isLimitReached && resetsIn === null && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">
          Please wait before making more requests
        </p>
      )}
    </div>
  );
};

interface RateLimitTrackingHookResult {
  rateLimitUsage: RateLimitUsage;
  setRateLimitUsage: React.Dispatch<React.SetStateAction<RateLimitUsage>>;
  updateRateLimitFromError: (error: any) => void;
}

/**
 * Hook for managing rate limit state
 */
export const useRateLimitTracking = (): RateLimitTrackingHookResult => {
  const [rateLimitUsage, setRateLimitUsage] = React.useState<RateLimitUsage>({
    used: 0,
    limit: 10,  // Default value from the backend
    resetsIn: null,
    isLimitReached: false
  });

  const updateRateLimitFromError = React.useCallback((error: any) => {
    // If rate limit info is available on the error, update the state
    if (error.rateLimitInfo) {
      const { limit, remaining, resetAfter } = error.rateLimitInfo;
      if (limit && remaining) {
        const used = Number(limit) - Number(remaining);
        setRateLimitUsage({
          used,
          limit: Number(limit),
          resetsIn: resetAfter ? Number(resetAfter) : null,
          isLimitReached: error.status === 429
        });
      }
    }
    
    // If this is a rate limit error, set the flag even without detailed info
    if (error.status === 429) {
      setRateLimitUsage(prev => ({
        ...prev,
        isLimitReached: true
      }));
    }
  }, []);

  return {
    rateLimitUsage,
    setRateLimitUsage,
    updateRateLimitFromError
  };
}; 