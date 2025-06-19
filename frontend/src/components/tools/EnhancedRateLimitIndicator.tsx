import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Server, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  resetTime: string | null;
  retryAfter?: number;
  backend: 'redis' | 'memory';
  isLimitReached: boolean;
}

interface EnhancedRateLimitIndicatorProps {
  rateLimitInfo: RateLimitInfo | null;
  isVisible?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const EnhancedRateLimitIndicator: React.FC<EnhancedRateLimitIndicatorProps> = ({
  rateLimitInfo,
  isVisible = true,
  showDetails = false,
  className = ''
}) => {
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Update countdown timers
  useEffect(() => {
    if (!rateLimitInfo) return;

    const interval = setInterval(() => {
      // Update reset countdown
      if (rateLimitInfo.resetTime) {
        const resetTime = new Date(rateLimitInfo.resetTime).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((resetTime - now) / 1000));
        setTimeUntilReset(diff);
      }

      // Update retry countdown
      if (rateLimitInfo.retryAfter) {
        setRetryCountdown(prev => prev !== null ? Math.max(0, prev - 1) : rateLimitInfo.retryAfter!);
      }
    }, 1000);

    // Initialize retry countdown
    if (rateLimitInfo.retryAfter) {
      setRetryCountdown(rateLimitInfo.retryAfter);
    }

    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  // Don't show if no rate limit info or not visible
  if (!isVisible || !rateLimitInfo || (rateLimitInfo.used === 0 && !rateLimitInfo.isLimitReached)) {
    return null;
  }

  const percentUsed = Math.min(100, Math.round((rateLimitInfo.used / rateLimitInfo.limit) * 100));
  
  // Determine status and styling
  const getStatusInfo = () => {
    if (rateLimitInfo.isLimitReached) {
      return {
        level: 'critical',
        color: 'destructive',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-700 dark:text-red-400',
        icon: XCircle,
        title: 'Rate Limit Exceeded'
      };
    } else if (percentUsed >= 90) {
      return {
        level: 'warning',
        color: 'destructive',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        textColor: 'text-yellow-700 dark:text-yellow-400',
        icon: AlertTriangle,
        title: 'Rate Limit Warning'
      };
    } else if (percentUsed >= 70) {
      return {
        level: 'caution',
        color: 'secondary',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        textColor: 'text-orange-700 dark:text-orange-400',
        icon: AlertTriangle,
        title: 'Rate Limit Monitor'
      };
    } else {
      return {
        level: 'normal',
        color: 'default',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        textColor: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
        title: 'Rate Limit Status'
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  };

  const getProgressColor = (): string => {
    if (percentUsed >= 90) return 'bg-red-500';
    if (percentUsed >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg p-4 transition-all duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusInfo.textColor}`} />
          <h3 className={`font-medium text-sm ${statusInfo.textColor}`}>
            {statusInfo.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Backend Status Badge */}
          <Badge variant={rateLimitInfo.backend === 'redis' ? 'default' : 'secondary'} className="text-xs">
            <Server className="h-3 w-3 mr-1" />
            {rateLimitInfo.backend === 'redis' ? 'Redis' : 'Memory'}
          </Badge>
          
          {/* Usage Badge */}
          <Badge variant="outline" className="text-xs">
            {rateLimitInfo.used}/{rateLimitInfo.limit}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">Usage</span>
          <span className="text-xs font-medium">{percentUsed}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {/* Status Messages and Timers */}
      <div className="space-y-2">
        {rateLimitInfo.isLimitReached && retryCountdown !== null && retryCountdown > 0 && (
          <Alert variant="destructive" className="py-2">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Rate limit exceeded. Retry in {formatTime(retryCountdown)}
            </AlertDescription>
          </Alert>
        )}

        {timeUntilReset !== null && timeUntilReset > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              Resets in {formatTime(timeUntilReset)}
            </span>
            {rateLimitInfo.remaining > 0 && (
              <span className="text-green-600 dark:text-green-400">
                {rateLimitInfo.remaining} requests remaining
              </span>
            )}
          </div>
        )}

        {/* Progressive warnings */}
        {!rateLimitInfo.isLimitReached && percentUsed >= 90 && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Critical: Only {rateLimitInfo.remaining} requests remaining
            </AlertDescription>
          </Alert>
        )}

        {!rateLimitInfo.isLimitReached && percentUsed >= 70 && percentUsed < 90 && (
          <Alert className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Warning: {rateLimitInfo.remaining} requests remaining
            </AlertDescription>
          </Alert>
        )}

        {/* Details section */}
        {showDetails && (
          <details className="mt-3">
            <summary className="text-xs cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              Technical Details
            </summary>
            <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Backend:</span>
                <span className="font-mono">{rateLimitInfo.backend}</span>
              </div>
              <div className="flex justify-between">
                <span>Limit:</span>
                <span className="font-mono">{rateLimitInfo.limit}</span>
              </div>
              <div className="flex justify-between">
                <span>Used:</span>
                <span className="font-mono">{rateLimitInfo.used}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-mono">{rateLimitInfo.remaining}</span>
              </div>
              {rateLimitInfo.resetTime && (
                <div className="flex justify-between">
                  <span>Reset Time:</span>
                  <span className="font-mono text-xs">
                    {new Date(rateLimitInfo.resetTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Hook for extracting rate limit info from API response headers
export const useRateLimitInfo = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const updateFromHeaders = useCallback((headers: Headers) => {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const resetTime = headers.get('X-RateLimit-Reset');
    const used = headers.get('X-RateLimit-Used');
    const backend = headers.get('X-RateLimit-Backend') as 'redis' | 'memory' | null;
    const retryAfter = headers.get('Retry-After');

    if (limit && remaining !== null && used !== null) {
      setRateLimitInfo({
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        used: parseInt(used, 10),
        resetTime: resetTime,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        backend: backend || 'memory',
        isLimitReached: parseInt(remaining, 10) === 0
      });
    }
  }, []);

  const updateFromError = useCallback((error: any) => {
    if (error.status === 429) {
      // Extract rate limit info from error response
      const errorData = error.data || error.response?.data || {};
      
      setRateLimitInfo(prev => ({
        limit: errorData.limit || prev?.limit || 50,
        remaining: errorData.remaining || 0,
        used: errorData.used || prev?.used || 0,
        resetTime: errorData.resetTime || prev?.resetTime || null,
        retryAfter: errorData.retryAfter,
        backend: prev?.backend || 'memory',
        isLimitReached: true
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setRateLimitInfo(null);
  }, []);

  return {
    rateLimitInfo,
    updateFromHeaders,
    updateFromError,
    reset
  };
}; 