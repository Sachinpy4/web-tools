import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ProcessingMode, getProcessingMode } from '../api/statusApi';

// Enhanced server state to differentiate between different types of connection issues
export type ServerState = 
  | 'connecting'     // Initial connection being established
  | 'connected'      // Server is connected and operational (with or without Redis)
  | 'unavailable'    // Server is completely down (connection refused)
  | 'circuit-open'   // Circuit breaker is open (temporary pause in connection attempts)
  | 'error';         // Server returned an error response

type ProcessingModeContextType = {
  processingMode: ProcessingMode;
  isLoading: boolean;
  isConnected: boolean;
  isInitializing: boolean;
  serverState: ServerState;
  errorDetails: string | null;
  nextRetryTime: number | null; // Time when next retry will happen
  error: Error | null;
  refreshMode: () => Promise<void>;
  retryConnection: () => void;
};

const ProcessingModeContext = createContext<ProcessingModeContextType>({
  processingMode: 'direct',
  isLoading: false,
  isConnected: false,
  isInitializing: true,
  serverState: 'connecting',
  errorDetails: null,
  nextRetryTime: null,
  error: null,
  refreshMode: async () => {},
  retryConnection: () => {},
});

export const useProcessingMode = () => useContext(ProcessingModeContext);

export const ProcessingModeProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('direct');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [serverState, setServerState] = useState<ServerState>('connecting');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(30000);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [initialChecksDone, setInitialChecksDone] = useState(false);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);
  const [circuitOpenTime, setCircuitOpenTime] = useState<number | null>(null);

  const fetchProcessingMode = async () => {
    if (isLoading) return;
    
    // If circuit is open, don't attempt connection until the retry time
    if (serverState === 'circuit-open' && circuitOpenTime && Date.now() < circuitOpenTime) {
      return;
    }
    
    setIsLoading(true);
    try {
      const mode = await getProcessingMode();
      setProcessingMode(mode);
      setError(null);
      setErrorDetails(null);
      setIsConnected(true);
      setServerState('connected');
      setConsecutiveErrors(0);
      setIsInitializing(false);
      setNextRetryTime(null);
      setCircuitOpenTime(null);
      
      if (pollingInterval > 30000) {
        setPollingInterval(30000);
      }
    } catch (err) {
      setIsConnected(false);
      
      // Categorize the error
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(err instanceof Error ? err : new Error(errorMessage));
      setErrorDetails(errorMessage);
      
      // Circuit breaker detection
      if (errorMessage.includes('circuit open')) {
        setServerState('circuit-open');
        
        // Extract retry time from error message if possible, or set a default
        const timeoutMatch = errorMessage.match(/try again in (\d+)s/i);
        const timeoutSeconds = timeoutMatch ? parseInt(timeoutMatch[1], 10) : 30;
        const retryTime = Date.now() + (timeoutSeconds * 1000);
        
        setNextRetryTime(retryTime);
        setCircuitOpenTime(retryTime);
      }
      // Determine server state based on error type
      else if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('Network request failed')) {
        // Complete server down case
        setServerState('unavailable');
      } else {
        // Other error cases (server returned error response)
        setServerState('error');
      }
      
      // Increment consecutive errors
      setConsecutiveErrors(prev => prev + 1);
      
      // Exponential backoff for polling with maximum of 5 minutes
      if (consecutiveErrors > 2) {
        const newInterval = Math.min(pollingInterval * 1.5, 5 * 60 * 1000);
        setPollingInterval(newInterval);
        
        // Set next retry time
        setNextRetryTime(Date.now() + newInterval);
      }
      
      // After initial checks, we're no longer initializing
      if (initialChecksDone) {
        setIsInitializing(false);
      }
      
      // Default to direct mode on error
      setProcessingMode('direct');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to retry connection manually
  const retryConnection = useCallback(() => {
    setServerState('connecting');
    setConsecutiveErrors(0);
    setPollingInterval(1000);
    setIsInitializing(true);
    setNextRetryTime(null);
    setCircuitOpenTime(null);
    fetchProcessingMode();
  }, []);

  useEffect(() => {
    // Initial fetch - try to connect quickly first
    const quickCheckInterval = 1000;
    
    // Do a few quick checks initially (0, 1s, 2s)
    const initialChecks = [
      fetchProcessingMode(),
      setTimeout(() => fetchProcessingMode(), quickCheckInterval),
      setTimeout(() => {
        fetchProcessingMode();
        setInitialChecksDone(true);
        if (!isConnected) setIsInitializing(false);
      }, quickCheckInterval * 2)
    ];
    
    // Clean up the timeouts
    return () => {
      initialChecks.forEach(timeout => {
        if (typeof timeout === 'number') clearTimeout(timeout);
      });
    };
  }, []);
  
  // Regular polling after initial checks
  useEffect(() => {
    if (!initialChecksDone) return;
    
    // Set up polling with dynamic interval
    const intervalId = setInterval(fetchProcessingMode, pollingInterval);
    
    // Cleanup
    return () => clearInterval(intervalId);
  }, [pollingInterval, initialChecksDone]); 

  // Update countdown timer every second when circuit is open
  useEffect(() => {
    if (serverState !== 'circuit-open' || !nextRetryTime) return;
    
    const countdownId = setInterval(() => {
      if (Date.now() >= nextRetryTime) {
        clearInterval(countdownId);
        fetchProcessingMode();
      }
    }, 1000);
    
    return () => clearInterval(countdownId);
  }, [serverState, nextRetryTime]);

  const contextValue: ProcessingModeContextType = {
    processingMode,
    isLoading,
    isConnected,
    isInitializing,
    serverState,
    errorDetails,
    nextRetryTime,
    error,
    refreshMode: fetchProcessingMode,
    retryConnection
  };

  return (
    <ProcessingModeContext.Provider value={contextValue}>
      {children}
    </ProcessingModeContext.Provider>
  );
}; 