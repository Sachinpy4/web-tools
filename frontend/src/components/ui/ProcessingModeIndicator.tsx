import React from 'react';
import { useProcessingMode } from '@/lib/context/ProcessingModeContext';
import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Server, Cpu, Loader2, WifiOff } from 'lucide-react';

export function ProcessingModeIndicator() {
  const { processingMode, isLoading, isConnected, refreshMode } = useProcessingMode();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 px-2 py-0 h-6">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking...</span>
      </Badge>
    );
  }

  if (!isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="destructive"
              className="gap-1 px-2 py-0 h-6 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => refreshMode()}
            >
              <WifiOff className="h-3 w-3" />
              <span className="text-xs">Server Offline</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Cannot connect to backend server</p>
            <p className="text-xs text-muted-foreground mt-1">Using local processing mode</p>
            <p className="text-xs text-muted-foreground mt-1">Click to retry connection</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isQueued = processingMode === 'queued';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isQueued ? "default" : "secondary"}
            className={`gap-1 px-2 py-0 h-6 cursor-pointer hover:opacity-80 transition-opacity ${
              isQueued ? 'bg-blue-600' : 'bg-amber-600'
            }`}
            onClick={() => refreshMode()}
          >
            {isQueued ? (
              <Server className="h-3 w-3" />
            ) : (
              <Cpu className="h-3 w-3" />
            )}
            <span className="text-xs">
              {isQueued ? 'Queued Mode' : 'Direct Mode'}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {isQueued 
              ? 'Using Redis queue for high concurrency processing' 
              : 'Using direct processing mode (limited concurrency)'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Click to refresh</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 