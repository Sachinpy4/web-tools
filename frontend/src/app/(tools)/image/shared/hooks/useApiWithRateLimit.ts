import { apiRequest } from '@/lib/apiClient';
import { useRateLimitTracking } from '../components/RateLimitTracking';

interface UseApiWithRateLimitReturn {
  makeApiRequestWithRateLimitTracking: <T>(endpoint: string, options: any) => Promise<T>;
}

export const useApiWithRateLimit = (): UseApiWithRateLimitReturn => {
  const { updateRateLimitFromError } = useRateLimitTracking();

  const makeApiRequestWithRateLimitTracking = async <T,>(endpoint: string, options: any): Promise<T> => {
    try {
      // Make the actual API request using the centralized apiRequest function
      const result = await apiRequest<T>(endpoint, options);
      
      return result;
    } catch (error: any) {
      // Use the shared error handler to track rate limit info
      updateRateLimitFromError(error);
      
      // Re-throw the error for the caller to handle
      throw error;
    }
  };

  return {
    makeApiRequestWithRateLimitTracking
  };
}; 