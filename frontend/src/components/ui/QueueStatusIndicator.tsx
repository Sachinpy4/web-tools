import React from 'react';
import { Clock, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface QueueStatusIndicatorProps {
  queuePosition?: number | null;
  estimatedWaitTime?: string | null;
  isProcessing?: boolean;
  className?: string;
}

export const QueueStatusIndicator: React.FC<QueueStatusIndicatorProps> = ({
  queuePosition,
  estimatedWaitTime,
  isProcessing = false,
  className = ""
}) => {
  // Don't show anything if no queue info
  if (!queuePosition && !isProcessing) {
    return null;
  }

  // Show processing status
  if (isProcessing) {
    return (
      <Alert className={`bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ${className}`}>
        <Clock className="h-4 w-4" />
        <AlertTitle className="text-blue-800 dark:text-blue-400">Processing</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-500">
          Your image is being processed right now.
        </AlertDescription>
      </Alert>
    );
  }

  // Show queue position
  if (queuePosition) {
    return (
      <Alert className={`bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 ${className}`}>
        <Users className="h-4 w-4" />
        <AlertTitle className="text-amber-800 dark:text-amber-400">
          Position in Queue: #{queuePosition}
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-500">
          {queuePosition === 1 ? (
            "You're next! Your image will be processed shortly."
          ) : (
            <>
              {queuePosition - 1} {queuePosition === 2 ? 'person is' : 'people are'} ahead of you.
              {estimatedWaitTime && (
                <span className="block mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Estimated wait time: {estimatedWaitTime}
                </span>
              )}
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}; 