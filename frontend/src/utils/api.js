import axios from 'axios';

let envUrl = import.meta.env.VITE_API_URL || 'https://careerpilot-ai-8d0x.onrender.com';

// Force HTTPS to prevent Render 301 redirects (which silently convert POST requests into GET requests and cause 405 Method Not Allowed)
if (envUrl.startsWith('http://') && !envUrl.includes('localhost')) {
  envUrl = envUrl.replace('http://', 'https://');
}

// Strip trailing slashes to prevent double slashes
if (envUrl.endsWith('/')) {
  envUrl = envUrl.slice(0, -1);
}

const baseURL = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;

const api = axios.create({
  baseURL: baseURL,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization errors (e.g. redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
