import axios from "axios";

// Em produção, usa URL relativa (mesmo domínio)
// Em desenvolvimento, usa a variável de ambiente
const API_URL = process.env.REACT_APP_BACKEND_URL || "";

// Função helper que adiciona o token em cada chamada
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Função para construir a URL correta
const buildUrl = (path) => {
  // Se API_URL está definido, usa ele + /api + path
  // Se não, usa apenas /api + path (URL relativa)
  return `${API_URL}/api${path}`;
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
