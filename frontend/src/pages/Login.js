import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, LogIn, Shield, Loader2, Ban } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Login() {
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [config, setConfig] = useState({ nome_sistema: "FastPay", logo_url: "" });
  const [blocked, setBlocked] = useState(null); // { blocked: true, reason: "motivo" }
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

    if (requires2FA && !twoFactorCode) {
      toast.error("Digite o código 2FA");
      return;
    }

    setLoading(true);
    try {
      // Tenta login com 2FA
      const response = await axios.post(`${API}/auth/login-2fa`, {
        codigo,
        senha,
        two_factor_code: twoFactorCode || null
      });
      
      // Se requer 2FA, mostra campo
      if (response.data.requires_2fa) {
        setRequires2FA(true);
        toast.info("Digite o código do seu autenticador");
        setLoading(false);
        return;
      }
      
      // Login bem sucedido
      const { user, token } = response.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // Atualiza o contexto de auth manualmente
      window.location.href = user.role === "admin" ? "/admin" : "/dashboard";
    } catch (error) {
      const detail = error.response?.data?.detail || "";
      
      if (detail === "Código 2FA inválido") {
        toast.error("Código 2FA inválido");
        setTwoFactorCode("");
      } else if (detail.startsWith("BLOCKED:")) {
        // Conta bloqueada com motivo
        const reason = detail.replace("BLOCKED:", "");
        setBlocked({ blocked: true, reason });
      } else if (detail === "Conta bloqueada") {
        setBlocked({ blocked: true, reason: "" });
      } else {
        toast.error(detail || "Erro ao fazer login");
        setRequires2FA(false);
        setTwoFactorCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setTwoFactorCode("");
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
            <p className="mt-2 text-slate-400">
              {requires2FA ? "Verificação em duas etapas" : "Entre na sua conta"}
            </p>
          </div>

          {/* Blocked Message */}
          {blocked ? (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Ban className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-red-400 mb-2">Conta Bloqueada</h2>
                <p className="text-slate-400 text-sm mb-4">
                  Sua conta foi bloqueada pelo administrador.
                </p>
                {blocked.reason && (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">Motivo:</p>
                    <p className="text-white">{blocked.reason}</p>
                  </div>
                )}
              </div>
              <Button
                type="button"
                onClick={() => {
                  setBlocked(null);
                  setCodigo("");
                  setSenha("");
                }}
                variant="outline"
                className="w-full border-slate-700"
              >
                Tentar outra conta
              </Button>
            </div>
          ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {!requires2FA ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="codigo" className="text-slate-300">Código de Acesso</Label>
                  <Input
                    id="codigo"
                    type="text"
                    placeholder="Ex: ABC12345"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 h-12"
                    disabled={loading}
                    data-testid="login-codigo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-slate-300">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-600 h-12 pr-12"
                      disabled={loading}
                      data-testid="login-senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm">
                    Digite o código de 6 dígitos do seu aplicativo autenticador
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="2fa" className="text-slate-300">Código 2FA</Label>
                  <Input
                    id="2fa"
                    type="text"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-slate-900/50 border-slate-800 text-white text-center text-2xl tracking-widest font-mono h-14"
                    maxLength={6}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-slate-400 text-sm hover:text-white transition-colors"
                >
                  ← Voltar
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-green-500/20"
              data-testid="login-submit"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  {requires2FA ? "Verificar" : "Entrar"}
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

      {/* Right Side - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-green-900/20 via-slate-900 to-slate-950 items-center justify-center p-12">
        <div className="text-center max-w-lg">
          <div className="w-32 h-32 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 font-bold text-5xl">$</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            {config.nome_sistema || "Sistema de Pagamentos PIX"}
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Receba pagamentos, gerencie indicações e acompanhe suas comissões em tempo real.
          </p>
          
          {/* Destaques */}
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-slate-400 text-sm">Seguro</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                <LogIn className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-slate-400 text-sm">Rápido</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
