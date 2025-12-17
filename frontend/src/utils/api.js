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

// Debug: mostra qual URL está sendo usada (remover em produção final)
console.log("=== API CONFIG ===");
console.log("API_URL:", API_URL);
console.log("Current Origin:", typeof window !== 'undefined' ? window.location.origin : 'N/A');

// Função helper que adiciona o token em cada chamada
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  // Debug: mostra se o token está presente
  console.log("[API] getAuthHeaders - Token presente:", !!token);
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

// Função que faz a chamada e loga detalhes
const makeRequest = async (method, url, data = null, config = {}) => {
  const fullUrl = buildUrl(url);
  const headers = { ...getAuthHeaders(), ...config.headers };
  
  console.log(`[API] ${method.toUpperCase()} ${url}`);
  console.log(`[API] Headers Authorization:`, headers.Authorization ? 'Bearer ***' : 'AUSENTE!');
  
  const requestConfig = { ...config, headers };
  
  try {
    let response;
    if (method === 'get' || method === 'delete') {
      response = await axios[method](fullUrl, requestConfig);
    } else {
      response = await axios[method](fullUrl, data, requestConfig);
    }
    return response;
  } catch (error) {
    console.log(`[API] ERRO ${method.toUpperCase()} ${url}:`, error.response?.status, error.message);
    throw error;
  }
};

// API wrapper com retry automático para erros de rede
const api = {
  get: (url, config = {}) => {
    return withRetry(() => makeRequest('get', url, null, config));
  },
  post: (url, data, config = {}) => {
    return withRetry(() => makeRequest('post', url, data, config));
  },
  put: (url, data, config = {}) => {
    return withRetry(() => makeRequest('put', url, data, config));
  },
  delete: (url, config = {}) => {
    return withRetry(() => makeRequest('delete', url, null, config));
  },
  patch: (url, data, config = {}) => {
    return withRetry(() => makeRequest('patch', url, data, config));
  }
};

export default api;
