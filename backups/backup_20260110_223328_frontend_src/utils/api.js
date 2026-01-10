import axios from "axios";

// Detecta a URL base da API
// Em produção (domínio próprio), usa a URL atual do navegador
// Em desenvolvimento/preview, usa a variável de ambiente
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    
    // Se está em um domínio de produção (não é localhost nem preview.emergentagent)
    // usa o mesmo domínio para evitar problemas de CORS e configuração
    if (!currentOrigin.includes('localhost') && 
        !currentOrigin.includes('preview.emergentagent.com')) {
      return currentOrigin;
    }
  }
  
  // Em desenvolvimento ou preview, usa a variável de ambiente
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Fallback final: usa a origem atual
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return "";
};

const API_URL = getApiBaseUrl();

// Função helper que adiciona o token em cada chamada
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return { 'Cache-Control': 'no-cache' };
  return { 
    Authorization: `Bearer ${token}`,
    'Cache-Control': 'no-cache'
  };
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

// API wrapper com retry automático para erros de rede
const api = {
  get: (url, config = {}) => {
    return withRetry(() => axios.get(buildUrl(url), {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    }));
  },
  post: (url, data, config = {}) => {
    return withRetry(() => axios.post(buildUrl(url), data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    }));
  },
  put: (url, data, config = {}) => {
    return withRetry(() => axios.put(buildUrl(url), data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    }));
  },
  delete: (url, config = {}) => {
    return withRetry(() => axios.delete(buildUrl(url), {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    }));
  },
  patch: (url, data, config = {}) => {
    return withRetry(() => axios.patch(buildUrl(url), data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    }));
  }
};

export default api;
