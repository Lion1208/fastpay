import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cria uma instância de axios configurada
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Silencia erros 401/403 no console para não poluir
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Se não estiver em página pública, limpa o token inválido
      const publicPaths = ['/login', '/register', '/p/'];
      const isPublicPath = publicPaths.some(path => window.location.pathname.includes(path));
      
      if (!isPublicPath && error.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
