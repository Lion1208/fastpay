import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";

export default function Register() {
  const { codigo } = useParams();
  const [formData, setFormData] = useState({
    codigo_indicador: codigo || "",
    nome: "",
    email: "",
    cpf_cnpj: "",
    whatsapp: "",
    senha: "",
    confirmarSenha: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (codigo) {
      setFormData(prev => ({ ...prev, codigo_indicador: codigo }));
    }
  }, [codigo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCpfCnpj = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
    }
  };

  const formatWhatsapp = (value) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.senha) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      toast.error("As senhas não conferem");
      return;
    }

    if (formData.senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { confirmarSenha, ...registerData } = formData;
      const user = await register(registerData);
      toast.success(`Conta criada! Seu código de acesso é: ${user.codigo}`);
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Back Button */}
          <Link 
            to="/login" 
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar ao login
          </Link>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white">Criar Conta</h1>
            <p className="mt-2 text-slate-400">Preencha os dados para se cadastrar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Código do Indicador */}
            <div className="space-y-2">
              <Label htmlFor="codigo_indicador" className="text-slate-300">
                Código do Indicador <span className="text-slate-500">(opcional)</span>
              </Label>
              <Input
                id="codigo_indicador"
                name="codigo_indicador"
                type="text"
                placeholder="Ex: ABC12345"
                value={formData.codigo_indicador}
                onChange={(e) => handleChange({ target: { name: "codigo_indicador", value: e.target.value.toUpperCase() } })}
                className="input-default h-11 uppercase"
                data-testid="register-indicador"
              />
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-slate-300">
                Nome Completo <span className="text-red-400">*</span>
              </Label>
              <Input
                id="nome"
                name="nome"
                type="text"
                placeholder="Seu nome completo"
                value={formData.nome}
                onChange={handleChange}
                className="input-default h-11"
                data-testid="register-nome"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                E-mail <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                className="input-default h-11"
                data-testid="register-email"
              />
            </div>

            {/* CPF/CNPJ */}
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj" className="text-slate-300">
                CPF ou CNPJ <span className="text-slate-500">(opcional)</span>
              </Label>
              <Input
                id="cpf_cnpj"
                name="cpf_cnpj"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf_cnpj}
                onChange={(e) => handleChange({ target: { name: "cpf_cnpj", value: formatCpfCnpj(e.target.value) } })}
                className="input-default h-11"
                maxLength={18}
                data-testid="register-cpf"
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-slate-300">
                WhatsApp <span className="text-slate-500">(opcional)</span>
              </Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                type="text"
                placeholder="(00) 00000-0000"
                value={formData.whatsapp}
                onChange={(e) => handleChange({ target: { name: "whatsapp", value: formatWhatsapp(e.target.value) } })}
                className="input-default h-11"
                maxLength={15}
                data-testid="register-whatsapp"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-slate-300">
                Senha <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  name="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.senha}
                  onChange={handleChange}
                  className="input-default h-11 pr-12"
                  data-testid="register-senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmarSenha" className="text-slate-300">
                Confirmar Senha <span className="text-red-400">*</span>
              </Label>
              <Input
                id="confirmarSenha"
                name="confirmarSenha"
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={formData.confirmarSenha}
                onChange={handleChange}
                className="input-default h-11"
                data-testid="register-confirmar"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 btn-primary mt-6"
              data-testid="register-submit"
            >
              {loading ? (
                <div className="spinner w-5 h-5" />
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Criar Conta
                </>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-400">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-green-400 hover:text-green-300 font-medium">
                Fazer Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-lg text-center px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Comece a Receber Pagamentos
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Cadastre-se gratuitamente e receba seu código de acesso para começar a usar o sistema.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">1</div>
              <div className="text-left">
                <div className="font-medium text-white">Crie sua conta</div>
                <div className="text-sm text-slate-400">Receba seu código de acesso</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">2</div>
              <div className="text-left">
                <div className="font-medium text-white">Personalize sua página</div>
                <div className="text-sm text-slate-400">Configure sua identidade visual</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">3</div>
              <div className="text-left">
                <div className="font-medium text-white">Comece a receber</div>
                <div className="text-sm text-slate-400">Compartilhe seu link e receba PIX</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
