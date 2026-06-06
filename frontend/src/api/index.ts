import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const apiService = {
  getHealth: () => api.get('/health'),
  
  getProtectionZones: () => api.get('/protection-zones'),
  
  getCooperatives: () => api.get('/cooperatives'),
  getCooperative: (id: string) => api.get(`/cooperatives/${id}`),
  createCooperative: (data: any) => api.post('/cooperatives', data),
  
  getPlotBoundaries: (cooperativeId?: string) => 
    api.get('/plot-boundaries', { params: { cooperativeId } }),
  validatePlot: (coordinates: any[]) => 
    api.post('/plot-boundaries/validate', { coordinates }),
  createPlotBoundary: (data: any) => api.post('/plot-boundaries', data),
  
  getInspectionReports: (cooperativeId?: string) => 
    api.get('/inspection-reports', { params: { cooperativeId } }),
  createInspectionReport: (data: any) => api.post('/inspection-reports', data),
  verifyInspectionReport: (id: string, data?: any) => 
    api.post(`/inspection-reports/${id}/verify`, data),
  
  getCertificates: (params?: any) => api.get('/authorization-certificates', { params }),
  getCertificate: (id: string) => api.get(`/authorization-certificates/${id}`),
  applyCertificate: (data: any) => api.post('/authorization-certificates/apply', data),
  approveCertificate: (id: string, data: any) => 
    api.post(`/authorization-certificates/${id}/approve`, data),
  rejectCertificate: (id: string, data: any) => 
    api.post(`/authorization-certificates/${id}/reject`, data),
  
  getLabelUsages: (cooperativeId?: string) => 
    api.get('/label-usages', { params: { cooperativeId } }),
  createLabelUsage: (data: any) => api.post('/label-usages', data),
  
  getPatrolRecords: (cooperativeId?: string) => 
    api.get('/patrol-records', { params: { cooperativeId } }),
  createPatrolRecord: (data: any) => api.post('/patrol-records', data),
  
  getDashboardStats: () => api.get('/dashboard/stats')
};

export default api;
