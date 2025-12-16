import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Função helper que adiciona o token em cada chamada
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// API wrapper simples que sempre pega o token do localStorage
const api = {
  get: (url, config = {}) => {
    return axios.get(`${API_URL}/api${url}`, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  post: (url, data, config = {}) => {
    return axios.post(`${API_URL}/api${url}`, data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  put: (url, data, config = {}) => {
    return axios.put(`${API_URL}/api${url}`, data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  delete: (url, config = {}) => {
    return axios.delete(`${API_URL}/api${url}`, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  },
  patch: (url, data, config = {}) => {
    return axios.patch(`${API_URL}/api${url}`, data, {
      ...config,
      headers: { ...getAuthHeaders(), ...config.headers }
    });
  }
};

export default api;
