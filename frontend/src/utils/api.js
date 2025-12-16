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

export default api;
