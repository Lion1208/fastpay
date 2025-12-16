import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async (retryCount = 0) => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (error) {
      // Só faz logout se for erro 401 explícito (token inválido)
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } else if (retryCount < 2) {
        // Para outros erros (rede, timeout), tenta novamente
        setTimeout(() => fetchUser(retryCount + 1), 1000);
        return; // Não seta loading false ainda
      }
      // Após 2 tentativas, desiste mas NÃO faz logout (pode ser erro de rede temporário)
    } finally {
      if (retryCount >= 2 || !error || error.response?.status === 401) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = async (codigo, senha) => {
    const response = await api.post("/auth/login", { codigo, senha });
    const { user: userData, token: newToken } = response.data;
    
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await api.post("/auth/register", data);
    const { user: userData, token: newToken } = response.data;
    
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
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
