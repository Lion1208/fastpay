import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Login() {
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ nome_sistema: "FastPay", logo_url: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config/public`);
      setConfig(response.data);
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!codigo || !senha) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const user = await login(codigo, senha);
      toast.success(`Bem-vindo, ${user.nome}!`);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center">
            {config.logo_url ? (
              <img src={config.logo_url} alt={config.nome_sistema} className="h-16 mx-auto mb-6" />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 mb-6">
                <span className="text-green-400 font-bold text-3xl">$</span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-white">{config.nome_sistema}</h1>
            <p className="mt-2 text-slate-400">Entre na sua conta</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-slate-300">Código de Acesso</Label>
              <Input
                id="codigo"
                type="text"
                placeholder="Ex: ADMIN001 ou ABC12345"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="input-default h-12 uppercase"
                data-testid="login-codigo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-300">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="input-default h-12 pr-12"
                  data-testid="login-senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 btn-primary"
              data-testid="login-submit"
            >
              {loading ? (
                <div className="spinner w-5 h-5" />
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="text-center">
            <p className="text-slate-500 text-sm">
              Não tem uma conta? Solicite um link de cadastro ao seu indicador.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-lg text-center px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Sistema de Pagamentos PIX
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Receba pagamentos, gerencie indicações e acompanhe suas comissões em tempo real.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <div className="text-3xl font-bold text-green-400">2%</div>
              <div className="text-sm text-slate-400">Taxa por transação</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <div className="text-3xl font-bold text-green-400">1%</div>
              <div className="text-sm text-slate-400">Comissão indicação</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
