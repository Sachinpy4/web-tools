// Shared hooks for image processing tools

export * from '../components/RateLimitTracking';

import React from 'react';

/**
 * Hook for managing visual progress simulation
 * Provides smooth progress feedback for image processing operations
 */
export const useVisualProgress = () => {
  const [visualProgress, setVisualProgress] = React.useState<Record<number, number>>({});
  const [processingFiles, setProcessingFiles] = React.useState<Set<number>>(new Set());

  const activeSimulationsRef = React.useRef<Record<number, { cancel: () => void }>>({});

  /**
   * Starts a gradual progress simulation from 0% toward 90%.
   * Uses exponential decay so it starts fast and slows down,
   * giving realistic feedback while waiting for the actual result.
   * Call this BEFORE starting an API request.
   */
  const startProgressSimulation = React.useCallback((fileIndex: number) => {
    if (activeSimulationsRef.current[fileIndex]) {
      activeSimulationsRef.current[fileIndex].cancel();
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const startTime = Date.now();

    const update = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      // Exponential approach to 90%:
      //   ~35% at 2s, ~55% at 4s, ~72% at 7s, ~83% at 10s, ~88% at 15s
      const progress = Math.min(90, Math.round(90 * (1 - Math.exp(-elapsed / 5000))));

      setVisualProgress(prev => ({
        ...prev,
        [fileIndex]: progress
      }));

      if (progress < 90 && !cancelled) {
        timeoutId = setTimeout(update, 150);
      }
    };

    update();

    const cancel = () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      delete activeSimulationsRef.current[fileIndex];
    };

    activeSimulationsRef.current[fileIndex] = { cancel };
  }, []);

  /**
   * Completes progress from current value to 100% with a quick animation.
   */
  const completeProgress = React.useCallback((fileIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const duration = 400;

      const update = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const progress = Math.round(90 + 10 * eased);

        setVisualProgress(prev => ({
          ...prev,
          [fileIndex]: progress
        }));

        if (t >= 1) {
          resolve();
        } else {
          setTimeout(update, 30);
        }
      };

      update();
    });
  }, []);

  /**
   * Legacy method kept for backward compat — runs a fast 0→100% animation.
   * Prefer startProgressSimulation + showResultsAfterProgress instead.
   */
  const simulateProgress = React.useCallback((fileIndex: number, duration: number = 300) => {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      const interval = 50;

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
   * Cancels any active simulation, completes progress to 100%,
   * then sets the result and cleans up state.
   */
  const showResultsAfterProgress = React.useCallback(async (
    fileIndex: number,
    result: any,
    setResults: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    // Cancel any running simulation
    if (activeSimulationsRef.current[fileIndex]) {
      activeSimulationsRef.current[fileIndex].cancel();
    }

    // Complete progress to 100%
    await completeProgress(fileIndex);

    // Set the result
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
  }, [completeProgress]);

  /**
   * Cancels simulation and clears progress for a file (on error).
   */
  const cancelProgressSimulation = React.useCallback((fileIndex: number) => {
    if (activeSimulationsRef.current[fileIndex]) {
      activeSimulationsRef.current[fileIndex].cancel();
    }

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
  }, []);

  /**
   * Clears all progress states (for file drop/clear operations)
   */
  const clearAllProgress = React.useCallback(() => {
    // Cancel all active simulations
    Object.values(activeSimulationsRef.current).forEach(sim => sim.cancel());
    activeSimulationsRef.current = {};
    setVisualProgress({});
    setProcessingFiles(new Set());
  }, []);

  /**
   * Adjusts progress indices after file removal
   */
  const adjustProgressIndices = React.useCallback((removedIndex: number) => {
    // Cancel simulation for removed file
    if (activeSimulationsRef.current[removedIndex]) {
      activeSimulationsRef.current[removedIndex].cancel();
    }

    // Rebuild simulation refs with adjusted indices
    const newSimulations: Record<number, { cancel: () => void }> = {};
    Object.entries(activeSimulationsRef.current).forEach(([key, value]) => {
      const oldIndex = parseInt(key);
      if (oldIndex > removedIndex) {
        newSimulations[oldIndex - 1] = value;
      } else if (oldIndex < removedIndex) {
        newSimulations[oldIndex] = value;
      }
    });
    activeSimulationsRef.current = newSimulations;

    setVisualProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[removedIndex];
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
    startProgressSimulation,
    cancelProgressSimulation,
    showResultsAfterProgress,
    clearAllProgress,
    adjustProgressIndices
  };
};
