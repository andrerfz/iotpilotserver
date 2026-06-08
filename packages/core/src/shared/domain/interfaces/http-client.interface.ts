/**
 * HTTP Client Interface
 * Defines the contract for making HTTP requests
 * This abstraction allows us to swap implementations (axios, fetch, etc.)
 */
export interface HttpClient {
  /**
   * Performs a GET request
   * @param url The URL to request
   * @param config Optional request configuration
   * @returns Promise resolving to the response data
   */
  get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Performs a POST request
   * @param url The URL to request
   * @param data The request body data
   * @param config Optional request configuration
   * @returns Promise resolving to the response data
   */
  post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Performs a PUT request
   * @param url The URL to request
   * @param data The request body data
   * @param config Optional request configuration
   * @returns Promise resolving to the response data
   */
  put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Performs a DELETE request
   * @param url The URL to request
   * @param config Optional request configuration
   * @returns Promise resolving to the response data
   */
  delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}

/**
 * HTTP Request Configuration
 */
export interface HttpRequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
}

/**
 * HTTP Response
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

