// Shared hooks for image processing tools
// This will be expanded in the next refactoring step

export * from '../components/RateLimitTracking';

import React from 'react';

/**
 * Hook for managing visual progress simulation
 * Provides smooth progress feedback for image processing operations
 */
export const useVisualProgress = () => {
  const [visualProgress, setVisualProgress] = React.useState<Record<number, number>>({});
  const [processingFiles, setProcessingFiles] = React.useState<Set<number>>(new Set());

  /**
   * Simulates smooth progress animation from 0% to 100%
   */
  const simulateProgress = React.useCallback((fileIndex: number, duration: number = 300) => {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      const interval = 50; // Update every 50ms for smooth animation
      
      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        
        setVisualProgress(prev => ({
          ...prev,
          [fileIndex]: Math.round(progress)
        }));
        
        if (progress >= 100) {
          resolve();
        } else {
          setTimeout(updateProgress, interval);
        }
      };
      
      updateProgress();
    });
  }, []);

  /**
   * Shows results after progress animation completes
   */
  const showResultsAfterProgress = React.useCallback(async (fileIndex: number, result: any, setResults: React.Dispatch<React.SetStateAction<any[]>>) => {
    // Wait for visual progress to complete
    await simulateProgress(fileIndex);
    
    // Now show the actual result
    setResults(prevResults => {
      const newResults = [...prevResults];
      newResults[fileIndex] = result;
      return newResults;
    });
    
    // Clean up progress state
    setVisualProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileIndex];
      return newProgress;
    });
    
    setProcessingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileIndex);
      return newSet;
    });
  }, [simulateProgress]);

  /**
   * Clears all progress states (for file drop/clear operations)
   */
  const clearAllProgress = React.useCallback(() => {
    setVisualProgress({});
    setProcessingFiles(new Set());
  }, []);

  /**
   * Adjusts progress indices after file removal
   */
  const adjustProgressIndices = React.useCallback((removedIndex: number) => {
    setVisualProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[removedIndex];
      // Also need to adjust indices for remaining files
      const adjustedProgress: Record<number, number> = {};
      Object.entries(newProgress).forEach(([key, value]) => {
        const oldIndex = parseInt(key);
        if (oldIndex > removedIndex) {
          adjustedProgress[oldIndex - 1] = value;
        } else if (oldIndex < removedIndex) {
          adjustedProgress[oldIndex] = value;
        }
      });
      return adjustedProgress;
    });
    
    setProcessingFiles(prev => {
      const newSet = new Set<number>();
      prev.forEach(fileIndex => {
        if (fileIndex < removedIndex) {
          newSet.add(fileIndex);
        } else if (fileIndex > removedIndex) {
          newSet.add(fileIndex - 1);
        }
        // Don't add the removed index
      });
      return newSet;
    });
  }, []);

  return {
    visualProgress,
    processingFiles,
    setVisualProgress,
    setProcessingFiles,
    simulateProgress,
    showResultsAfterProgress,
    clearAllProgress,
    adjustProgressIndices
  };
}; 