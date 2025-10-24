// ============================================================================
// HTTP CLIENT - Axios wrapper with retry logic and idempotency support
// ============================================================================

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface HttpClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  idempotencyKey?: string;
  forwardAuthToken?: string;
}

/**
 * Create HTTP client with retry logic and standard headers
 */
export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'x-api-key': config.apiKey }),
    },
  });

  // Configure manual retry logic (simplified without axios-retry dependency)
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as any;
      if (!config || !config.retry) {
        config.retry = { count: 0, limit: config.retries || 3 };
      }

      // Retry on network errors and 5xx server errors
      if (
        config.retry.count < config.retry.limit &&
        (!error.response || (error.response.status >= 500))
      ) {
        config.retry.count += 1;
        const delayMs = Math.min(1000 * Math.pow(2, config.retry.count), 10000);
        
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return client.request(config);
      }

      return Promise.reject(error);
    }
  );

  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      console.log(`[HTTP Client] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        console.error(
          `[HTTP Client Error] ${error.response.status} - ${error.response.statusText}`
        );
      } else if (error.request) {
        console.error('[HTTP Client Error] No response received');
      } else {
        console.error(`[HTTP Client Error] ${error.message}`);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Enhanced request method with idempotency and auth forwarding
 */
export async function makeRequest<T = any>(
  client: AxiosInstance,
  options: RequestOptions
): Promise<T> {
  const headers: any = {
    ...options.headers,
  };

  // Add idempotency key if provided
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  // Forward authorization token if provided
  if (options.forwardAuthToken) {
    headers['Authorization'] = options.forwardAuthToken;
  }

  const response = await client.request<{ success: boolean; data: T; error?: any }>({
    ...options,
    headers,
  });

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed');
  }

  return response.data.data;
}
