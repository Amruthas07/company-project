/**
 * Real Axios HTTP API Client for SentinelAI
 * Communicates directly with the backend REST endpoints with JWT authorization header.
 */

import axios, { AxiosError } from 'axios';
import { ActivityEvent, CorporateFile, SecurityIncident, User } from '../types/threat';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT Bearer token to all outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sentinel_jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token if invalid or expired
      if (!window.location.pathname.includes('/login')) {
        console.warn('[API] Session expired or unauthorized.');
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authApi = {
  login: async (email: string, password?: string) => {
    const res = await apiClient.post('/auth/login', { email, password: password || 'Sentinel@2026' });
    return res.data;
  },
  register: async (payload: { name: string; email: string; password: string; department?: string; title?: string }) => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },
  me: async () => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
};

// Users Endpoints
export const usersApi = {
  getAll: async () => {
    const res = await apiClient.get<User[]>('/users');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },
};

// Files Endpoints
export const filesApi = {
  getAll: async () => {
    const res = await apiClient.get<CorporateFile[]>('/files');
    return res.data;
  },
};

// Activity Endpoints
export const activityApi = {
  getAll: async (userId?: string) => {
    const res = await apiClient.get<ActivityEvent[]>('/activity', { params: { userId } });
    return res.data;
  },
  log: async (eventType: string, details?: Record<string, any>, ipAddress?: string) => {
    const res = await apiClient.post<{
      event: ActivityEvent;
      currentRiskScore: number;
      currentRiskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELEVATED' | 'CRITICAL';
      incident?: SecurityIncident;
    }>('/activity', { eventType, details, ipAddress });
    return res.data;
  },
};

// Incidents Endpoints
export const incidentsApi = {
  getAll: async (userId?: string) => {
    const res = await apiClient.get<SecurityIncident[]>('/incidents', { params: { userId } });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get<SecurityIncident>(`/incidents/${id}`);
    return res.data;
  },
  override: async (id: string, action: 'RESTORE_ACCESS' | 'CONFIRM_RESTRICTION' | 'TERMINATE_SESSION', overrideReason: string) => {
    const res = await apiClient.post(`/incidents/${id}/override`, { action, overrideReason });
    return res.data;
  },
};

// Risk & SHAP Endpoints
export const riskApi = {
  getExplanation: async (userId: string) => {
    const res = await apiClient.get<{
      userId: string;
      userName: string;
      riskScore: number;
      riskBand: string;
      features: Record<string, any>;
      shapSummary: Array<{
        featureName: string;
        actualValue: any;
        shapValue: number;
        direction: 'RISK_BOOSTER' | 'RISK_DAMPENER';
        description: string;
      }>;
    }>(`/risk/explanation/${userId}`);
    return res.data;
  },
};

// Face Biometric Endpoints
export const faceApi = {
  register: async (userId?: string, faceEmbedding?: number[]) => {
    const res = await apiClient.post('/face/register', { userId, faceEmbedding });
    return res.data;
  },
  verify: async (payload: { incidentId: string; probeEmbedding?: number[]; isTestMatch?: boolean }) => {
    const res = await apiClient.post<{
      passed: boolean;
      similarityPercentage: number;
      status: string;
      incident: SecurityIncident;
      userState: {
        isRestricted: boolean;
        currentRiskScore: number;
        currentRiskBand: string;
      };
    }>('/face/verify', payload);
    return res.data;
  },
};

// Hardware USB Endpoints
export const hardwareApi = {
  toggleUsb: async (deviceName?: string) => {
    const res = await apiClient.post<{ attached: boolean; deviceName: string; connectedDevices: string[] }>(
      '/hardware/usb/toggle',
      { deviceName }
    );
    return res.data;
  },
  getUsbStatus: async (userId: string) => {
    const res = await apiClient.get<{ connectedDevices: string[] }>(`/hardware/usb/${userId}`);
    return res.data;
  },
};

// Simulation Endpoints (Section 17)
export const simulateApi = {
  triggerSuspiciousActivity: async (userId: string) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      incident: SecurityIncident;
      evaluation: any;
      userState: any;
    }>(`/simulate/suspicious-activity/${userId}`);
    return res.data;
  },
};

// Dashboard Stats Endpoint (Section 16)
export const dashboardApi = {
  getStats: async () => {
    const res = await apiClient.get<{
      meanRisk: number;
      activeIncidentsCount: number;
      totalIncidentsCount: number;
      monitoredEmployeesCount: number;
      restrictedEmployeesCount: number;
      telemetryEventsCount: number;
      systemStatus: string;
    }>('/dashboard/stats');
    return res.data;
  },
};

// Admin Operations
export const adminApi = {
  resetDemo: async () => {
    const res = await apiClient.post('/admin/reset-demo');
    return res.data;
  },
};
