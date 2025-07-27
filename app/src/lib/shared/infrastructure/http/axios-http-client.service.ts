import {HttpClient, HttpRequestConfig, HttpResponse} from '../../domain/interfaces/http-client.interface';
import axios from 'axios';

type AxiosInstance = ReturnType<typeof axios.create>;
type AxiosRequestConfig = Parameters<typeof axios.get>[1];
type AxiosResponse<T = any> = Awaited<ReturnType<typeof axios.get<T>>>;

/**
 * Axios-based implementation of HttpClient
 * Infrastructure layer implementation using axios library
 */
export class AxiosHttpClientService implements HttpClient {
  private readonly client: AxiosInstance;

  constructor(baseURL?: string, timeout?: number) {
    this.client = axios.create({
      baseURL,
      timeout: timeout || 10000, // Default 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const axiosConfig = this.mapToAxiosConfig(config);
    const response = await this.client.get<T>(url, axiosConfig);
    return this.mapToHttpResponse(response);
  }

  async post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const axiosConfig = this.mapToAxiosConfig(config);
    const response = await this.client.post<T>(url, data, axiosConfig);
    return this.mapToHttpResponse(response);
  }

  async put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const axiosConfig = this.mapToAxiosConfig(config);
    const response = await this.client.put<T>(url, data, axiosConfig);
    return this.mapToHttpResponse(response);
  }

  async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const axiosConfig = this.mapToAxiosConfig(config);
    const response = await this.client.delete<T>(url, axiosConfig);
    return this.mapToHttpResponse(response);
  }

  private mapToAxiosConfig(config?: HttpRequestConfig): AxiosRequestConfig {
    if (!config) return {};

    const axiosConfig: AxiosRequestConfig = {};

    if (config.headers) {
      axiosConfig.headers = config.headers;
    }

    if (config.timeout) {
      axiosConfig.timeout = config.timeout;
    }

    if (config.params) {
      axiosConfig.params = config.params;
    }

    return axiosConfig;
  }

  private mapToHttpResponse<T>(response: AxiosResponse<T>): HttpResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }
}

