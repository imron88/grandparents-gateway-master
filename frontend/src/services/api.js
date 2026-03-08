import axios from 'axios';

// IMPORTANT: baseURL must end with "/" so Axios doesn't strip the /api path
// when request URLs start with a letter (not "/").
// e.g. baseURL="https://backend.techshade.live/api/" + "auth/login" = correct
const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/?$/, '/') // ensure trailing slash
  : '/api/';

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        // Use BASE so refresh also hits the backend in production
        const { data } = await axios.post(`${BASE}auth/refresh`, {}, { withCredentials: true });
        sessionStorage.setItem('accessToken', data.accessToken);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api.request(err.config);
      } catch {
        sessionStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
