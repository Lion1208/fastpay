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
    console.log("[AuthContext] fetchUser chamado, tentativa:", retryCount + 1);
    const currentToken = localStorage.getItem("token");
    console.log("[AuthContext] Token atual no localStorage:", !!currentToken);
    
    if (!currentToken) {
      console.log("[AuthContext] Sem token, abortando fetchUser");
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get("/auth/me");
      console.log("[AuthContext] fetchUser sucesso:", response.data?.nome);
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.log("[AuthContext] fetchUser erro:", error.response?.status, error.message);
      // Só faz logout se for erro 401 explícito (token inválido)
      if (error.response?.status === 401) {
        console.log("[AuthContext] 401 - removendo token");
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setLoading(false);
      } else if (retryCount < 2) {
        // Para outros erros (rede, timeout), tenta novamente após 1 segundo
        console.log("[AuthContext] Erro de rede, tentando novamente em 1s");
        setTimeout(() => fetchUser(retryCount + 1), 1000);
      } else {
        // Após 2 tentativas, desiste mas NÃO faz logout (pode ser erro de rede temporário)
        // Mantém o usuário logado se já tinha um user anterior
        console.log("[AuthContext] Máximo de tentativas, finalizando loading");
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
