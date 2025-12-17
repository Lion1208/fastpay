import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Inicializa o token de forma síncrona
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token");
    console.log("[AuthContext] Init - Token no localStorage:", !!savedToken);
    return savedToken;
  });

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async (retryCount = 0) => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      // Só faz logout se for erro 401 explícito (token inválido)
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setLoading(false);
      } else if (retryCount < 2) {
        // Para outros erros (rede, timeout), tenta novamente após 1 segundo
        setTimeout(() => fetchUser(retryCount + 1), 1000);
      } else {
        // Após 2 tentativas, desiste mas NÃO faz logout (pode ser erro de rede temporário)
        // Mantém o usuário logado se já tinha um user anterior
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
