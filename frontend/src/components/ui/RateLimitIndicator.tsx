import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getRateLimitSettings } from '@/lib/api/statusApi';

interface RateLimitIndicatorProps {
  usage: number;
  resetsIn: number | null;
  isLimitReached?: boolean;
  type?: 'imageProcessing' | 'batchOperation' | 'api';
  className?: string;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  usage,
  resetsIn,
  isLimitReached = false,
  type = 'imageProcessing',
  className = ""
}) => {
  const [limit, setLimit] = useState<number>(50); // Default fallback
  const [windowMinutes, setWindowMinutes] = useState<number>(5);

  // Fetch dynamic rate limit settings
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const settings = await getRateLimitSettings();
        const typeSettings = settings[type];
        
        setLimit(typeSettings.max);
        setWindowMinutes(Math.ceil(typeSettings.windowMs / 60000)); // Convert to minutes
      } catch (error) {
        console.warn('Failed to fetch rate limit settings, using defaults:', error);
        // Keep defaults
      }
    };

    fetchLimits();
  }, [type]);

  // Calculate percentage used
  const percentUsed = Math.min(100, Math.round((usage / limit) * 100));
  
  // Determine indicator color based on usage
  let indicatorColor = "bg-green-500";
  let borderColor = "border-gray-200 dark:border-gray-800";
  let bgColor = "bg-gray-50 dark:bg-gray-900";
  
  if (percentUsed > 70) {
    indicatorColor = "bg-yellow-500";
    borderColor = "border-yellow-200 dark:border-yellow-800";
    bgColor = "bg-yellow-50 dark:bg-yellow-900/20";
  }
  
  if (percentUsed > 90 || isLimitReached) {
    indicatorColor = "bg-red-500";
    borderColor = "border-red-200 dark:border-red-800";
    bgColor = "bg-red-50 dark:bg-red-900/20";
  }
  
  // Only hide if no usage and not limit reached
  if (usage === 0 && !isLimitReached) return null;
  
  return (
    <Alert className={`${bgColor} ${borderColor} ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className={isLimitReached ? 'text-red-700 dark:text-red-400' : ''}>
        {isLimitReached ? 'Rate Limit Reached' : 'API Rate Limit'}
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>
              {usage} of {limit} requests used
              {windowMinutes && (
                <span className="text-muted-foreground ml-1">
                  (per {windowMinutes} min{windowMinutes !== 1 ? 's' : ''})
                </span>
              )}
            </span>
            <span className="text-xs">{percentUsed}%</span>
          </div>
          
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full ${indicatorColor} transition-all duration-300`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          
          {resetsIn !== null && (
            <p className={`text-xs ${isLimitReached ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
              <Clock className="h-3 w-3 inline mr-1" />
              Rate limit resets in {Math.ceil(resetsIn / 60)} minutes
            </p>
          )}
          
          {isLimitReached && resetsIn === null && (
            <p className="text-xs text-red-500 dark:text-red-400">
              Please wait before making more requests
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}; 