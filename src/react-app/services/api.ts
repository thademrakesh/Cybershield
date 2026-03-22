import axios from 'axios';


// Use environment variable if available, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token and ngrok skip warning
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Always add the ngrok skip warning header for ngrok tunnels
    config.headers['ngrok-skip-browser-warning'] = '69420';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post(
      '/auth/login',
      new URLSearchParams({ username, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  },
  register: async (userData: Record<string, unknown>) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  verifyRegistration: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-registration', { email, otp });
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (resetData: Record<string, unknown>) => {
    const response = await api.post('/auth/reset-password', resetData);
    return response.data;
  },
  updateProfile: async (profileData: Record<string, unknown>) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },
  uploadProfileImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/auth/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const captureService = {
  start: async (interfaceName = 'auto', filter?: string) => {
    const response = await api.post('/capture/start', { interface: interfaceName, filter });
    return response.data;
  },
  recent: async (limit = 5) => {
    const response = await api.get(`/capture/recent?limit=${limit}`);
    return response.data;
  },
  latest_features: async () => {
    const response = await api.get('/capture/latest_features');
    return response.data;
  },
  recent_features: async (source?: string, limit = 10, sessionId?: string) => {
    let url = `/capture/recent_features?limit=${limit}`;
    if (source) url += `&source=${encodeURIComponent(source)}`;
    if (sessionId) url += `&session_id=${encodeURIComponent(sessionId)}`;
    const response = await api.get(url);
    return response.data;
  },
  stop: async () => {
    const response = await api.post('/capture/stop');
    return response.data;
  },
  status: async () => {
    const response = await api.get('/capture/status');
    return response.data;
  },
  interfaces: async () => {
    const response = await api.get('/capture/interfaces');
    return response.data;
  },
};

export const mlService = {
  predict: async (features: Record<string, unknown>) => {
    const response = await api.post('/predict', { features });
    return response.data;
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  explain: async (features: Record<string, unknown>) => {
    const response = await api.post('/explain', { features });
    return response.data;
  },
};

export const logsService = {
  getLogs: async (limit = 100, sessionId?: string) => {
    const response = await api.get(`/logs/?limit=${limit}${sessionId ? `&session_id=${sessionId}` : ''}`);
    return response.data;
  },
  export: async (sessionId?: string) => {
    const response = await api.get(`/logs/export${sessionId ? `?session_id=${sessionId}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const alertsService = {
  getAlerts: async (sessionId?: string) => {
    const response = await api.get(`/alerts/${sessionId ? `?session_id=${sessionId}` : ''}`);
    return response.data;
  },
  acknowledge: async (alertId: string, sessionId?: string) => {
    const response = await api.post(`/alerts/acknowledge/${alertId}${sessionId ? `?session_id=${sessionId}` : ''}`);
    return response.data;
  }
}

export const sessionsService = {
  getSessions: async () => {
    const response = await api.get('/sessions/');
    return response.data;
  },
  deleteSession: async (sessionId: string) => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  }
}

export const analyticsService = {
  summary: async (sessionId?: string) => {
    const response = await api.get(`/analytics/summary${sessionId ? `?session_id=${sessionId}` : ''}`);
    return response.data;
  },
  trends: async () => {
    const response = await api.get('/analytics/trends');
    return response.data;
  },
  threatTrends: async () => {
    const response = await api.get('/analytics/threat-trends');
    return response.data;
  },
  detectionRate: async () => {
    const response = await api.get('/analytics/detection-rate');
    return response.data;
  },
  geoDistribution: async () => {
    const response = await api.get('/analytics/geo-distribution');
    return response.data;
  },
  userActivity: async () => {
    const response = await api.get('/analytics/user-activity');
    return response.data;
  }
}

export const adminService = {
  getMetrics: async () => {
    const response = await api.get('/admin/model/metrics');
    return response.data;
  },
  getSystemHealth: async () => {
    const response = await api.get('/admin/system/health');
    return response.data;
  },
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  createUser: async (userData: Record<string, unknown>) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  updateUser: async (userId: string, userData: Record<string, unknown>) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  uploadModel: async (modelFile: File, encodersFile?: File, metricsFile?: File) => {
    const formData = new FormData();
    formData.append('model_file', modelFile);
    if (encodersFile) formData.append('encoders_file', encodersFile);
    if (metricsFile) formData.append('metrics_file', metricsFile);
    
    const response = await api.post('/admin/model/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  retrainModel: async () => {
    const response = await api.post('/admin/model/retrain');
    return response.data;
  },
  getAlertConfig: async () => {
    const response = await api.get('/admin/alert-config');
    return response.data;
  },
  updateAlertConfig: async (config: Record<string, unknown>) => {
    const response = await api.post('/admin/alert-config', config);
    return response.data;
  },
  getSystemSettings: async () => {
    const response = await api.get('/admin/system-settings');
    return response.data;
  },
  updateSystemSettings: async (settings: Record<string, unknown>) => {
    const response = await api.post('/admin/system-settings', settings);
    return response.data;
  }
};

export const auditService = {
  getLogs: async (limit = 1000) => {
    const response = await api.get(`/admin/audit/?limit=${limit}`);
    return response.data;
  },
  export: async () => {
    const response = await api.get('/admin/audit/export', {
      responseType: 'blob',
    });
    return response.data;
  }
};

export const riskService = {
  getSummary: async () => {
    const response = await api.get('/risk/summary');
    return response.data;
  },
  getHosts: async () => {
    const response = await api.get('/risk/hosts');
    return response.data;
  },
  getSources: async () => {
    const response = await api.get('/risk/sources');
    return response.data;
  },
  getTrends: async () => {
    const response = await api.get('/risk/trends');
    return response.data;
  },
  export: async () => {
    const response = await api.get('/risk/export', {
      responseType: 'blob',
    });
    return response.data;
  }
};

export const incidentsService = {
  getIncidents: async (status?: string, assignedTo?: string, limit = 50) => {
    let url = `/incidents/?limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (assignedTo) url += `&assigned_to=${assignedTo}`;
    const response = await api.get(url);
    return response.data;
  },
  createIncident: async (incidentData: Record<string, unknown>) => {
    const response = await api.post('/incidents/', incidentData);
    return response.data;
  },
  getIncident: async (incidentId: string) => {
    const response = await api.get(`/incidents/${incidentId}`);
    return response.data;
  },
  updateIncident: async (incidentId: string, updateData: Record<string, unknown>) => {
    const response = await api.put(`/incidents/${incidentId}`, updateData);
    return response.data;
  },
  addNote: async (incidentId: string, note: string) => {
    const response = await api.post(`/incidents/${incidentId}/notes`, { note });
    return response.data;
  },
  performAction: async (incidentId: string, actionType: string, details: string) => {
    const response = await api.post(`/incidents/${incidentId}/actions`, { action_type: actionType, details });
    return response.data;
  },
  export: async (incidentId: string) => {
    const response = await api.get(`/incidents/export/${incidentId}`, {
      responseType: 'blob',
    });
    return response.data;
  }
};

export default api;
