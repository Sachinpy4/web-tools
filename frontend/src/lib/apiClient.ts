// API Client utility
// This is a wrapper around fetch() for API requests

import { toast } from '@/components/ui/use-toast';

// Get the API base URL from env var or default to localhost
export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  isFormData?: boolean; // New option for FormData support
  responseType?: 'json' | 'blob'; // Response type - blob for file downloads
  noRedirect?: boolean; // Option to prevent automatic redirects on auth errors
  retry?: number; // Number of retries for failed requests
  retryDelay?: number; // Delay between retries in ms
  // Circuit breaker options
  bypassCircuitBreaker?: boolean; // Option to bypass circuit breaker
}

// Rate limit information from API responses
export interface RateLimitInfo {
  limit: string | null;
  remaining: string | null;
  reset: string | null;
  resetAfter: string | null;
  retryAfter: string | null;
}

// API Error details interface
export interface ApiErrorDetails {
  status: number;
  rateLimitInfo: RateLimitInfo | null;
  data: Record<string, unknown> | null;
  response: { status: number; data: Record<string, unknown> | null };
  validation: boolean;
}

// Custom API Error class with typed properties
export class ApiError extends Error {
  status: number;
  rateLimitInfo: RateLimitInfo | null;
  data: Record<string, unknown> | null;
  response: { status: number; data: Record<string, unknown> | null };
  validation: boolean;

  constructor(message: string, details: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status;
    this.rateLimitInfo = details.rateLimitInfo;
    this.data = details.data;
    this.response = details.response;
    this.validation = details.validation;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Track failed endpoints to avoid repeated toasts
const failedEndpoints = new Set<string>();
const failedEndpointTimeouts: Record<string, NodeJS.Timeout> = {};

// Circuit breaker state
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

const circuitBreaker: CircuitBreakerState = {
  isOpen: false,
  failureCount: 0,
  lastFailureTime: 0,
  nextAttemptTime: 0
};

// Circuit breaker thresholds
const CIRCUIT_OPEN_THRESHOLD = 5; // Open after 5 consecutive failures
const CIRCUIT_RESET_TIMEOUT_BASE = 5000; // Start with 5s timeout, doubles each time
const MAX_CIRCUIT_RESET_TIMEOUT = 2 * 60 * 1000; // Cap at 2 minutes

// Check if circuit breaker is open for all non-essential requests
const isCircuitOpen = (): boolean => {
  const now = Date.now();

  // If the circuit is open but it's time to try again, allow one request through
  if (circuitBreaker.isOpen && now >= circuitBreaker.nextAttemptTime) {
    // Allow this request through but keep the circuit open
    // If this request succeeds, the circuit will be reset in the main function
    return false;
  }

  return circuitBreaker.isOpen;
};

// Open the circuit breaker when server is unreachable
const openCircuitBreaker = (): void => {
  circuitBreaker.isOpen = true;
  circuitBreaker.lastFailureTime = Date.now();

  // Calculate backoff time - exponential with maximum cap
  const backoffMs = Math.min(
    CIRCUIT_RESET_TIMEOUT_BASE * Math.pow(2, Math.min(circuitBreaker.failureCount, 6)),
    MAX_CIRCUIT_RESET_TIMEOUT
  );

  circuitBreaker.nextAttemptTime = Date.now() + backoffMs;
};

// Reset the circuit breaker after successful requests
const resetCircuitBreaker = (): void => {
  circuitBreaker.isOpen = false;
  circuitBreaker.failureCount = 0;
  circuitBreaker.lastFailureTime = 0;
  circuitBreaker.nextAttemptTime = 0;
};

// Clear failed endpoint after 30 seconds
const clearFailedEndpoint = (endpoint: string) => {
  failedEndpoints.delete(endpoint);
  if (failedEndpointTimeouts[endpoint]) {
    clearTimeout(failedEndpointTimeouts[endpoint]);
    delete failedEndpointTimeouts[endpoint];
  }
};

/**
 * Make an API request to the backend
 * @param endpoint API endpoint path starting with /
 * @param options Request options
 * @returns Response data from the API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    requireAuth = false,
    isFormData = false,
    responseType = 'json',
    noRedirect = false,
    retry = 1, // Default to 1 retry
    retryDelay = 500, // Default delay of 500ms
    bypassCircuitBreaker = false // Default to using circuit breaker
  } = options;

  // Check circuit breaker (except for critical operations)
  if (!bypassCircuitBreaker && isCircuitOpen() && endpoint !== 'health') {
    // Skip request if circuit is open and this isn't a health check
    const error = new Error('Server is currently unavailable (circuit open)');
    throw error;
  }

  // Helper function to make the actual request
  const makeRequest = async (attemptsLeft: number): Promise<T> => {
    try {
      // Prepare URL - ensure endpoint starts with '/'
      const baseUrl = getApiUrl();
      const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        ...headers,
      };

      // Only set Content-Type to application/json if not form data
      if (!isFormData) {
        requestHeaders['Content-Type'] = 'application/json';
      }

      // Add authorization header if needed
      if (requireAuth) {
        // Guard against SSR - localStorage only available in browser
        if (typeof window === 'undefined') {
          throw new Error('Authentication required (SSR context)');
        }
        
        // Ensure we're getting the latest token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          // Redirect to login if token missing and redirects are allowed
          if (!noRedirect) {
            window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          }

          throw new Error('Authentication required');
        }
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      // Prepare request options with AbortController for 30s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
        credentials: 'include', // Include cookies for cross-origin requests
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (method !== 'GET' && body) {
        if (isFormData) {
          requestOptions.body = body;
        } else {
          requestOptions.body = JSON.stringify(body);
        }
      }

      let response: Response;
      try {
        response = await fetch(url, requestOptions);
      } finally {
        clearTimeout(timeoutId);
      }

      // Handle HTTP errors before resetting circuit breaker
      if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        let rateLimitInfo: RateLimitInfo | null = null;
        let errorData: Record<string, unknown> | null = null;

        try {
          // Try to parse error message from response
          errorData = await response.json();
          errorMessage = (errorData?.message as string) || errorMessage;

          // Store rate limit information from headers if available
          if (response.status === 429) {
            rateLimitInfo = {
              limit: response.headers.get('RateLimit-Limit'),
              remaining: response.headers.get('RateLimit-Remaining'),
              reset: response.headers.get('RateLimit-Reset'),
              resetAfter: response.headers.get('RateLimit-Reset-After'),
              retryAfter: response.headers.get('Retry-After')
            };

            // Enhance the error message with rate limit info
            if (rateLimitInfo.retryAfter) {
              errorMessage = `You've reached your limit. It will reset after ${rateLimitInfo.retryAfter} seconds.`;
            } else if (rateLimitInfo.resetAfter) {
              errorMessage = `You've reached your limit. It will reset after ${rateLimitInfo.resetAfter} seconds.`;
            } else if (endpoint.includes('images/')) {
              // More generic message when exact time isn't available
              errorMessage = `You've reached your limit for image processing. It will reset after some time.`;
            }
          }
        } catch (_e) {
          // If response is not JSON, use status text
        }

        // Create typed API error
        const error = new ApiError(errorMessage, {
          status: response.status,
          rateLimitInfo,
          data: errorData,
          response: { status: response.status, data: errorData },
          validation: response.status === 400
        });

        // Handle auth errors
        if (response.status === 401 && !noRedirect) {
          // Only redirect if we're not already on the login page
          if (!window.location.pathname.includes('/login')) {
            // Clear token and redirect to login
            localStorage.removeItem('token');
            window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
          }
        }

        throw error;
      }

      // Successful response — reset circuit breaker
      resetCircuitBreaker();

      // Clear this endpoint from the failed endpoints list if it was previously failed
      if (failedEndpoints.has(endpoint)) {
        clearFailedEndpoint(endpoint);
      }

      // Handle blob response (e.g. file downloads)
      if (responseType === 'blob') {
        return (await response.blob()) as unknown as T;
      }

      // Try to parse as JSON, or return text
      try {
        const text = await response.text();

        try {
          return JSON.parse(text) as T;
        } catch {
          // If not valid JSON, return as text
          return text as unknown as T;
        }
      } catch (_e) {
        if (failedEndpoints.has(endpoint)) {
          clearFailedEndpoint(endpoint);
        }
        throw new Error('Failed to read response body');
      }
    } catch (error) {
      // Check for network errors that might indicate server is down
      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed'));

      if (isNetworkError) {
        // Increment circuit breaker failure count
        circuitBreaker.failureCount++;

        // Open circuit breaker if threshold reached
        if (circuitBreaker.failureCount >= CIRCUIT_OPEN_THRESHOLD) {
          openCircuitBreaker();
        }
      }

      // Only retry on network errors (or other errors that might be temporary)
      if (attemptsLeft > 0 && isNetworkError) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Attempt retry with one less attempt remaining
        return makeRequest(attemptsLeft - 1);
      }

      // Errors are handled by the calling functions

      // Only show a toast if this endpoint hasn't failed recently
      if (!failedEndpoints.has(endpoint)) {
        failedEndpoints.add(endpoint);

        // Set a timeout to clear this endpoint from the failed list
        failedEndpointTimeouts[endpoint] = setTimeout(() => {
          clearFailedEndpoint(endpoint);
        }, 30000); // Clear after 30 seconds

        // Show a user-friendly toast for non-health check endpoints
        if (endpoint !== 'health') {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'An unexpected error occurred',
            variant: 'destructive',
          });
        }
      }

      // Re-throw for caller to handle
      throw error;
    }
  };

  // Start the request process with the specified number of retries
  return makeRequest(retry);
} 