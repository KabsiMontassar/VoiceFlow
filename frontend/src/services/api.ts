import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiRequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: ApiRequestConfig = {}) {
    this.loadTokens();

    this.client = axios.create({
      baseURL: config.baseURL || API_BASE_URL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest?._retry && this.refreshToken) {
          originalRequest._retry = true;

          try {
            const response = await axios.post(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refreshToken: this.refreshToken }
            );

            const newAccessToken = response.data.data?.accessToken;
            if (newAccessToken) {
              this.setAccessToken(newAccessToken);
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private loadTokens(): void {
    try {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    } catch {
      this.clearTokens();
    }
  }

  private saveTokens(): void {
    if (this.accessToken) {
      localStorage.setItem('accessToken', this.accessToken);
    }
    if (this.refreshToken) {
      localStorage.setItem('refreshToken', this.refreshToken);
    }
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    this.saveTokens();
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
    this.saveTokens();
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.saveTokens();
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Auth endpoints
  async register(data: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }) {
    const response = await this.client.post('/api/v1/auth/register', data);
    return response.data as ApiResponse;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/api/v1/auth/login', data);
    return response.data as ApiResponse;
  }

  async refreshAccessToken(refreshToken: string) {
    const response = await this.client.post('/api/v1/auth/refresh', { refreshToken });
    return response.data as ApiResponse;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/v1/auth/me');
    return response.data as ApiResponse;
  }

  async logout() {
    try {
      // Call backend logout endpoint to invalidate session
      await this.client.post('/api/v1/auth/logout');
    } catch (error) {
      console.warn('Backend logout failed:', error);
    } finally {
      this.clearTokens();
    }
    return { success: true };
  }

  async logoutAll() {
    try {
      await this.client.post('/api/v1/auth/logout-all');
    } catch (error) {
      console.warn('Backend logout-all failed:', error);
    } finally {
      this.clearTokens();
    }
    return { success: true };
  }

  async getUserSessions() {
    const response = await this.client.get('/api/v1/auth/sessions');
    return response.data as ApiResponse;
  }

  async getAuthStatus() {
    const response = await this.client.get('/api/v1/auth/status');
    return response.data as ApiResponse;
  }

  // Room endpoints
  async createRoom(data: {
    name: string;
    description?: string;
    maxUsers?: number;
  }) {
    const response = await this.client.post('/api/v1/rooms', data);
    return response.data as ApiResponse;
  }

  async getRoomById(roomId: string) {
    const response = await this.client.get(`/api/v1/rooms/${roomId}`);
    return response.data as ApiResponse;
  }

  async getRoomByCode(code: string) {
    const response = await this.client.get(`/api/v1/rooms/code/${code}`);
    return response.data as ApiResponse;
  }

  async listUserRooms(page = 1, limit = 20) {
    const response = await this.client.get('/api/v1/rooms', {
      params: { page, limit },
    });
    return response.data as ApiResponse;
  }

  async updateRoom(roomId: string, data: {
    name?: string;
    description?: string;
    maxUsers?: number;
  }) {
    const response = await this.client.put(`/api/v1/rooms/${roomId}`, data);
    return response.data as ApiResponse;
  }

  async deleteRoom(roomId: string) {
    const response = await this.client.delete(`/api/v1/rooms/${roomId}`);
    return response.data as ApiResponse;
  }

  async joinRoom(roomId: string) {
    const response = await this.client.post(`/api/v1/rooms/${roomId}/join`);
    return response.data as ApiResponse;
  }

  async leaveRoom(roomId: string) {
    const response = await this.client.post(`/api/v1/rooms/${roomId}/leave`);
    return response.data as ApiResponse;
  }

  async getRoomMembers(roomId: string) {
    const response = await this.client.get(`/api/v1/rooms/${roomId}/members`);
    return response.data as ApiResponse;
  }

  // Message endpoints
  async sendMessage(data: {
    roomId: string;
    content: string;
    type?: 'text' | 'file';
    fileId?: string;
  }) {
    const response = await this.client.post('/api/v1/messages', data);
    return response.data as ApiResponse;
  }

  async getRoomMessages(roomId: string, page = 1, limit = 50) {
    const response = await this.client.get(`/api/v1/messages/${roomId}`, {
      params: { page, limit },
    });
    return response.data as ApiResponse;
  }

  async deleteMessage(messageId: string) {
    const response = await this.client.delete(`/api/v1/messages/${messageId}`);
    return response.data as ApiResponse;
  }

  async editMessage(messageId: string, content: string) {
    const response = await this.client.put(`/api/v1/messages/${messageId}`, {
      content,
    });
    return response.data as ApiResponse;
  }

  // User endpoints
  async getUserProfile(userId: string) {
    const response = await this.client.get(`/api/v1/users/${userId}`);
    return response.data as ApiResponse;
  }

  async updateProfile(data: {
    username?: string;
    avatarUrl?: string;
  }) {
    const response = await this.client.put('/api/v1/users/me', data);
    return response.data as ApiResponse;
  }

  async searchUsers(query: string) {
    const response = await this.client.get('/api/v1/users/search', {
      params: { query },
    });
    return response.data as ApiResponse;
  }

  // Generic methods
  get<T>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: any, config?: any) {
    return this.client.put<T>(url, data, config);
  }

  delete<T>(url: string, config?: any) {
    return this.client.delete<T>(url, config);
  }

  patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
