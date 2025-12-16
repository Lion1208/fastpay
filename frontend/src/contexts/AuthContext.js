import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Interceptor global para adicionar o token em TODAS as requisições
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros 401 (token expirado/inválido)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado - faz logout silencioso
      const currentPath = window.location.pathname;
      // Só redireciona se não estiver na página de login/registro
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem("token");
        // Não redireciona automaticamente, deixa o componente tratar
      }
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (codigo, senha) => {
    const response = await axios.post(`${API}/auth/login`, { codigo, senha });
    const { user: userData, token: newToken } = response.data;
    
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    const { user: userData, token: newToken } = response.data;
    
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
