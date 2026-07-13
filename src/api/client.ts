import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from './storage';

const API_URL = 'https://truckerai-backend-517086663129.us-central1.run.app/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
        await SecureStore.setItemAsync('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  me: () => api.get('/auth/me/'),
  updateHOS: (data: { duty_status: string }) =>
    api.patch('/driver/hos/', data),
};

// Loads
export const loadsApi = {
  list: (params?: Record<string, any>) => api.get('/loads/', { params }),
  detail: (id: number) => api.get(`/loads/${id}/`),
  updateStatus: (id: number, status: string, notes?: string) =>
    api.post(`/loads/${id}/transition/`, { status, notes }),
  myLoads: () => api.get('/loads/', { params: { mine: true } }),
};

// Dispatch / Messaging
export const dispatchApi = {
  conversations: () => api.get('/conversations/'),
  messages: (convId: number, params?: Record<string, any>) =>
    api.get(`/conversations/${convId}/messages/`, { params }),
  send: (convId: number, body: string) =>
    api.post(`/conversations/${convId}/messages/`, { body }),
};

// Routes
export const routesApi = {
  plan: (origin: string, destination: string, driverId?: number) =>
    api.post('/routes/plan/', { origin, destination, driver_id: driverId }),
  list: () => api.get('/routes/'),
};

// Voice
export const voiceApi = {
  textInteract: (text: string, sessionId?: string) =>
    api.post('/voice/text/', { text, session_id: sessionId }),
  audioInteract: (formData: FormData) =>
    api.post('/voice/interact/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  proactiveAlert: () => api.get('/voice/proactive/'),
  endSession: (sessionId: string) =>
    api.post('/voice/end/', { session_id: sessionId }),
};

// Financials
export const financialsApi = {
  logFuel: (data: Record<string, any>) => api.post('/fuel-purchases/', data),
  logExpense: (data: Record<string, any>) => api.post('/expenses/', data),
  deadlines: () => api.get('/deadlines/'),
};

// Telemetry
export const telemetryApi = {
  fleet: () => api.get('/telemetry/fleet/'),
  postRecord: (data: Record<string, any>) => api.post('/telemetry/', data),
  fuelStats: () => api.get('/telemetry/fuel-stats/'),
};

// Maintenance
export const maintenanceApi = {
  dashboard: () => api.get('/maintenance/dashboard/'),
  alerts: () => api.get('/maintenance/alerts/'),
  records: (params?: Record<string, any>) => api.get('/maintenance/records/', { params }),
  createRecord: (data: Record<string, any>) => api.post('/maintenance/records/', data),
  uploadPhotos: (pk: number, formData: FormData) =>
    api.post(`/maintenance/records/${pk}/photos/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Health
export const healthApi = {
  consent: () => api.get('/health/consent/'),
  updateConsent: (data: Record<string, any>) => api.put('/health/consent/', data),
  postRecord: (data: Record<string, any>) => api.post('/health/records/', data),
  history: () => api.get('/health/history/'),
  fleetFatigue: () => api.get('/health/fleet-fatigue/'),
};

// Communications
export const communicationsApi = {
  log: (params?: Record<string, any>) => api.get('/communications/', { params }),
  notify: (data: Record<string, any>) => api.post('/communications/notify/', data),
};

// Onboarding
export const onboardingApi = {
  status: () => api.get('/onboarding/status/'),
  acknowledgeSafety: () => api.post('/onboarding/acknowledge-voice-safety/', { acknowledged: true }),
  setAiKey: (key: string) => api.post('/onboarding/set-ai-key/', { anthropic_api_key: key }),
  documents: () => api.get('/onboarding/documents/'),
};