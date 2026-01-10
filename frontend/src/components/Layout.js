import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Wallet, 
  DollarSign, 
  Palette, 
  Code, 
  MessageSquare,
  LogOut,
  Menu,
  X,
  Settings,
  ChevronDown,
  Shield,
  Copy,
  ArrowLeftRight,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";


const userMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CreditCard, label: "Transações", path: "/transactions" },
  { icon: Users, label: "Indicações", path: "/referrals" },
  { icon: DollarSign, label: "Comissões", path: "/commissions" },
  { icon: Wallet, label: "Saques", path: "/withdrawals" },
  { icon: ArrowLeftRight, label: "Transferências", path: "/transfers" },
  { icon: Palette, label: "Personalização", path: "/personalization" },
  { icon: Code, label: "API", path: "/api-integration" },
  { icon: MessageSquare, label: "Suporte", path: "/tickets" },
];

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: CreditCard, label: "Transações", path: "/transactions" },
  { icon: Users, label: "Indicações", path: "/referrals" },
  { icon: DollarSign, label: "Comissões", path: "/commissions" },
  { icon: Wallet, label: "Saques", path: "/withdrawals" },
  { icon: ArrowLeftRight, label: "Transferências", path: "/transfers" },
  { icon: Palette, label: "Personalização", path: "/personalization" },
  { icon: Code, label: "API", path: "/api-integration" },
  { divider: true },
  { icon: Users, label: "Gerenciar Usuários", path: "/admin/users" },
  { icon: Wallet, label: "Gerenciar Saques", path: "/admin/withdrawals" },
  { icon: MessageSquare, label: "Gerenciar Tickets", path: "/admin/tickets" },
  { icon: Shield, label: "Equipe Admin", path: "/admin/team" },
  { icon: Settings, label: "Configurações", path: "/admin/config" },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState({ nome_sistema: "FastPix", logo_url: "" });
  const [lastTransferCheck, setLastTransferCheck] = useState(null);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem("showBalance");
    return saved !== null ? saved === "true" : true;
  });

  const isAdmin = user?.role === "admin";
  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  // Salva preferência de visibilidade do saldo
  const toggleBalanceVisibility = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem("showBalance", newValue.toString());
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  // Saldo a mostrar
  const userBalance = user?.saldo_disponivel || 0;

  // Buscar tickets não lidos
  useEffect(() => {
    const fetchUnreadTickets = async () => {
      try {
        const endpoint = isAdmin ? '/admin/tickets/unread-count' : '/tickets/unread-count';
        const response = await api.get(endpoint);
        setUnreadTickets(response.data.count || 0);
      } catch (error) {
        // Silenciosamente falha se endpoint não existir
      }
    };

    if (user?.id) {
      fetchUnreadTickets();
      // Polling a cada 30 segundos
      const interval = setInterval(fetchUnreadTickets, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, isAdmin]);

  // Busca configuração pública do sistema
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get(`/config/public`);
        // Mantém valores padrão se não vierem no response
        setConfig(prev => ({
          ...prev,
          ...response.data,
          nome_sistema: response.data?.nome_sistema || prev.nome_sistema || "FastPix"
        }));
      } catch (error) {
        // Ignora erros silenciosamente, mantém o valor padrão
      }
    };
    fetchConfig();
  }, []);

  // Polling para notificações de transferências recebidas
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user?.id || !token) return;
    
    const formatMoney = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
    
    const checkNewTransfers = async () => {
      if (!localStorage.getItem("token")) return;
      
      try {
        const response = await api.get(`/transfers`);
        const transfers = response.data.transfers || [];
        const received = transfers.filter(t => t.destinatario_id === user.id);
        
        if (received.length > 0) {
          const latestTransfer = received[0];
          const latestTime = new Date(latestTransfer.created_at).getTime();
          
          if (lastTransferCheck && latestTime > lastTransferCheck) {
            toast.success(
              `💰 Você recebeu ${formatMoney(latestTransfer.valor_recebido)} de ${latestTransfer.remetente_nome}!`,
              { duration: 8000 }
            );
          }
          setLastTransferCheck(latestTime);
        }
      } catch (error) {
        // Ignora erros silenciosamente
      }
    };
    
    // Inicia após 3 segundos e repete a cada 20 segundos
    const timeout = setTimeout(checkNewTransfers, 3000);
    const interval = setInterval(checkNewTransfers, 20000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [user?.id, lastTransferCheck]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  };

  const referralLink = `${window.location.origin}/register/${user?.codigo}`;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixo na tela */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/50 border-r border-white/5 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.logo_url ? (
                  <img src={config.logo_url} alt={config.nome_sistema} className="h-10" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 font-bold text-xl">$</span>
                  </div>
                )}
                <div>
                  <h1 className="font-bold text-white">{config.nome_sistema}</h1>
                  <p className="text-xs text-slate-500">Sistema PIX</p>
                </div>
              </div>
              <button 
                className="lg:hidden text-slate-400 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {isAdmin && (
              <div className="mb-4 px-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={12} />
                  Painel Admin
                </span>
              </div>
            )}
            
            {menuItems.map((item, index) => {
              if (item.divider) {
                return (
                  <div key={`divider-${index}`} className="my-2 mx-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mt-2 px-1">Administração</p>
                  </div>
                );
              }
              
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isTicketMenu = item.path === '/tickets' || item.path === '/admin/tickets';
              const showBadge = isTicketMenu && unreadTickets > 0;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.path.replace(/\//g, '-')}`}
                >
                  <div className="relative">
                    <Icon size={20} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                      {unreadTickets > 9 ? '9+' : unreadTickets}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Referral Link */}
          <div className="p-4 border-t border-white/5">
            {(isAdmin || (user?.indicacoes_liberadas > 0 && user?.indicacoes_usadas < user?.indicacoes_liberadas)) ? (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Seu Link de Indicação</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-green-400 truncate flex-1">{user?.codigo}</code>
                  <button
                    onClick={() => copyToClipboard(referralLink)}
                    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                    data-testid="copy-referral-btn"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-slate-500 mt-2">
                    {user?.indicacoes_liberadas - user?.indicacoes_usadas} indicação(ões) disponível(eis)
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-500">Sem indicações disponíveis</p>
              </div>
            )}
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-green-400 font-semibold">
                  {user?.nome?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
                <p className="text-xs text-slate-500 truncate mono">{user?.codigo}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Com margem para o sidebar fixo */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 glass-heavy">
          <div className="px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden text-slate-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-lg font-semibold text-white hide-mobile">
                {menuItems.find(item => item.path === location.pathname)?.label || "Dashboard"}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Saldo Disponível */}
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
                <Wallet className="w-4 h-4 text-green-400 hidden sm:block" />
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {showBalance ? formatCurrency(userBalance) : "R$ •••••"}
                </span>
                <button
                  onClick={toggleBalanceVisibility}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
                >
                  {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <span className="text-green-400 text-sm font-semibold">
                        {user?.nome?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user?.nome}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem 
                    className="text-slate-300 focus:text-white focus:bg-slate-800"
                    onClick={() => navigate("/settings")}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Segurança (2FA)
                  </DropdownMenuItem>
                  {!isAdmin && (
                    <DropdownMenuItem 
                      className="text-slate-300 focus:text-white focus:bg-slate-800"
                      onClick={() => navigate("/personalization")}
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      Personalização
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-800" />
                  <DropdownMenuItem 
                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                    onClick={handleLogout}
                    data-testid="logout-btn"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
