import axios from "axios";

// Detecta a URL base da API
// 1. Primeiro tenta usar a variável de ambiente
// 2. Se não existir, usa a URL atual do navegador (mesmo domínio)
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  // Fallback: usa o mesmo domínio do frontend
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return "";
};

const API_URL = getApiBaseUrl();

// Função helper que adiciona o token em cada chamada
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

// Função para construir a URL correta
const buildUrl = (path) => {
  return `${API_URL}/api${path}`;
};

// Função de retry para chamadas que falham por erro de rede
const withRetry = async (fn, retries = 1) => {
  try {
    return await fn();
  } catch (error) {
    // Não faz retry para erros 4xx (são erros de cliente, não de rede)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      throw error;
    }
    // Para erros de rede/5xx, tenta novamente
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

// API wrapper simples que sempre pega o token do localStorage
const api = {
  get: (url, config = {}) => {
    return axios.get(buildUrl(url), {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  post: (url, data, config = {}) => {
    return axios.post(buildUrl(url), data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  put: (url, data, config = {}) => {
    return axios.put(buildUrl(url), data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  delete: (url, config = {}) => {
    return axios.delete(buildUrl(url), {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  patch: (url, data, config = {}) => {
    return axios.patch(buildUrl(url), data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  }
};

export default api;
