import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Bell,
  Link2,
  QrCode,
  Eye,
  EyeOff,
  Send,
  Receipt,
  History,
  Banknote,
  Plus,
  Loader2,
  Timer,
  AlertTriangle,
  Key,
  ShieldAlert
} from "lucide-react";
import { Button } from "../components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { isPushSupported, isSubscribedToPush } from "../utils/push";

const PIX_EXPIRATION_MINUTES = 20;

// Gera um CPF válido aleatório (com dígitos verificadores corretos)
const generateValidCPF = () => {
  const randomDigit = () => Math.floor(Math.random() * 9);
  const cpfArray = Array.from({ length: 9 }, randomDigit);
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += cpfArray[i] * (10 - i);
  }
  let d1 = 11 - (sum % 11);
  d1 = d1 >= 10 ? 0 : d1;
  cpfArray.push(d1);
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += cpfArray[i] * (11 - i);
  }
  let d2 = 11 - (sum % 11);
  d2 = d2 >= 10 ? 0 : d2;
  cpfArray.push(d2);
  
  return cpfArray.join('');
};

const generateRandomName = () => {
  const firstNames = ['João', 'Maria', 'José', 'Ana', 'Pedro', 'Paula', 'Carlos', 'Lucas', 'Julia', 'Gabriel'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Rodrigues', 'Almeida'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem("showBalance");
    return saved !== null ? saved === "true" : true;
  });
  
  // Modal de depósito
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositTransaction, setDepositTransaction] = useState(null);
  const [depositTimeRemaining, setDepositTimeRemaining] = useState(null);

  useEffect(() => {
    fetchStats();
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if (isPushSupported()) {
      const subscribed = await isSubscribedToPush();
      setPushEnabled(subscribed);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value || 0);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const toggleBalance = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem("showBalance", newValue.toString());
  };

  // Criar depósito
  const handleDeposit = async () => {
    const valor = parseFloat(depositAmount);
    if (!valor || valor < 10) {
      toast.error("Valor mínimo: R$ 10,00");
      return;
    }
    if (valor > 5000) {
      toast.error("Valor máximo: R$ 5.000,00");
      return;
    }

    setDepositLoading(true);
    try {
      const cpfValido = generateValidCPF();
      const nomeValido = generateRandomName();
      
      const response = await api.post('/transactions', {
        valor: valor,
        cpf_cnpj: cpfValido,
        nome_pagador: nomeValido,
        descricao: "Depósito em carteira"
      });
      setDepositTransaction(response.data);
      setDepositTimeRemaining(PIX_EXPIRATION_MINUTES * 60); // Inicia timer
      toast.success("PIX gerado! Escaneie o QR Code");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao gerar depósito");
    } finally {
      setDepositLoading(false);
    }
  };

  // Timer de expiração do depósito
  useEffect(() => {
    if (depositTransaction && depositTransaction.status === "pending" && depositTimeRemaining > 0) {
      const timer = setInterval(() => {
        setDepositTimeRemaining(prev => {
          if (prev <= 1) {
            setDepositTransaction(t => ({ ...t, status: "expired" }));
            toast.error("PIX expirado!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [depositTransaction, depositTimeRemaining]);

  // Polling para verificar pagamento do depósito
  useEffect(() => {
    if (depositTransaction && depositTransaction.status === "pending") {
      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/transactions/${depositTransaction.id}/status`);
          if (response.data.status === "paid") {
            setDepositTransaction(prev => ({ ...prev, status: "paid" }));
            toast.success("Depósito confirmado!");
            fetchStats();
            clearInterval(interval);
          } else if (response.data.status === "expired") {
            setDepositTransaction(prev => ({ ...prev, status: "expired" }));
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Erro ao verificar status:", error);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [depositTransaction]);

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setDepositAmount("");
    setDepositTransaction(null);
    setDepositTimeRemaining(null);
  };

  const referralProgress = stats 
    ? (stats.valor_minimo_indicacao > 0 
        ? (stats.valor_movimentado / stats.valor_minimo_indicacao) * 100 
        : 100) 
    : 0;

  // Combinar transações para o extrato
  const getExtrato = () => {
    const items = [];
    
    if (stats?.recent_transactions) {
      stats.recent_transactions.forEach(tx => {
        items.push({
          id: tx.id,
          tipo: 'entrada',
          descricao: tx.nome_pagador ? `PIX de ${tx.nome_pagador}` : 'Pagamento PIX',
          valor: tx.valor_liquido || tx.valor,
          status: tx.status,
          data: tx.paid_at || tx.created_at,
          icon: ArrowDownLeft,
          color: 'green'
        });
      });
    }
    
    if (stats?.recent_transfers_sent) {
      stats.recent_transfers_sent.forEach(t => {
        items.push({
          id: t.id,
          tipo: 'saida',
          descricao: `Para ${t.destinatario_nome}`,
          valor: -t.valor,
          status: 'paid',
          data: t.created_at,
          icon: ArrowUpRight,
          color: 'red'
        });
      });
    }
    
    if (stats?.recent_transfers_received) {
      stats.recent_transfers_received.forEach(t => {
        items.push({
          id: t.id,
          tipo: 'entrada',
          descricao: `De ${t.remetente_nome}`,
          valor: t.valor_recebido,
          status: 'paid',
          data: t.created_at,
          icon: ArrowDownLeft,
          color: 'green'
        });
      });
    }
    
    if (stats?.recent_commissions) {
      stats.recent_commissions.forEach(c => {
        items.push({
          id: c.id,
          tipo: 'comissao',
          descricao: `Comissão`,
          valor: c.valor_comissao,
          status: 'paid',
          data: c.created_at,
          icon: DollarSign,
          color: 'purple'
        });
      });
    }
    
    return items.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      </Layout>
    );
  }

  const extrato = getExtrato();
  const saldoTotal = (stats?.saldo_disponivel || 0) + (stats?.saldo_comissoes || 0);

  return (
    <Layout>
      <div className="space-y-3 animate-fade-in w-full max-w-full overflow-x-hidden" data-testid="dashboard">
        
        {/* ========== SALDO PRINCIPAL ========== */}
        <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs truncate">Olá, {user?.nome?.split(" ")[0]}</p>
            <button onClick={toggleBalance} className="p-1 rounded bg-slate-700/50 text-slate-400">
              {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Saldo */}
          <div className="mb-3">
            <p className="text-slate-500 text-[10px]">Saldo Total</p>
            <p className="text-xl font-bold text-white">
              {showBalance ? formatCurrency(saldoTotal) : "R$ •••••"}
            </p>
          </div>

          {/* Breakdown */}
          <div className="flex gap-4 mb-3 text-xs">
            <div>
              <p className="text-slate-500 text-[10px]">Disponível</p>
              <p className="text-white font-medium text-sm">
                {showBalance ? formatCurrency(stats?.saldo_disponivel) : "•••"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px]">Comissões</p>
              <p className="text-purple-400 font-medium text-sm">
                {showBalance ? formatCurrency(stats?.saldo_comissoes) : "•••"}
              </p>
            </div>
          </div>

          {/* Ações Rápidas - 2x2 grid compacto */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex flex-col items-center gap-0.5 p-2 rounded bg-green-500/10 border border-green-500/20 hover:bg-green-500/20"
              data-testid="btn-depositar"
            >
              <Plus className="w-4 h-4 text-green-400" />
              <span className="text-[10px] text-slate-300">Depositar</span>
            </button>
            
            <button
              onClick={() => navigate('/transfers')}
              className="flex flex-col items-center gap-0.5 p-2 rounded bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20"
              data-testid="btn-transferir"
            >
              <Send className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] text-slate-300">Transferir</span>
            </button>
            
            <button
              onClick={() => navigate('/withdrawals')}
              className="flex flex-col items-center gap-0.5 p-2 rounded bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20"
              data-testid="btn-sacar"
            >
              <Banknote className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] text-slate-300">Sacar</span>
            </button>
            
            <button
              onClick={() => window.open(`/p/${user?.codigo}`, '_blank')}
              className="flex flex-col items-center gap-0.5 p-2 rounded bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20"
              data-testid="btn-cobrar"
            >
              <QrCode className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] text-slate-300">Cobrar</span>
            </button>
          </div>
        </div>

        {/* ========== LINK DE PAGAMENTO ========== */}
        <div className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link2 className="w-3 h-3 text-green-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-400 truncate">
              {window.location.origin}/p/{user?.codigo}
            </span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${window.location.origin}/p/${user?.codigo}`)} className="h-6 w-6 p-0">
              <Copy className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(`/p/${user?.codigo}`, '_blank')} className="h-6 w-6 p-0">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* ========== EXTRATO ========== */}
        <Card className="card-dashboard">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs text-white flex items-center gap-1.5">
              <History className="w-3 h-3 text-slate-400" />
              Extrato
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {extrato.length > 0 ? (
              <div className="space-y-0.5">
                {extrato.map((item, index) => {
                  const IconComponent = item.icon;
                  const isPositive = item.valor >= 0;
                  return (
                    <div key={`${item.id}-${index}`} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          item.color === 'green' ? 'bg-green-500/20' :
                          item.color === 'red' ? 'bg-red-500/20' :
                          'bg-purple-500/20'
                        }`}>
                          <IconComponent className={`w-3 h-3 ${
                            item.color === 'green' ? 'text-green-400' :
                            item.color === 'red' ? 'text-red-400' :
                            'text-purple-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-white">{item.descricao}</p>
                          <p className="text-[9px] text-slate-500">
                            {new Date(item.data).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <p className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(item.valor)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <Receipt className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="text-slate-500 text-[10px]">Nenhuma movimentação</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== INDICAÇÕES + GRÁFICO ========== */}
        <div className="grid grid-cols-1 gap-3">
          {/* Indicações */}
          <Card className="card-dashboard">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-medium text-white">Indicações</span>
              </div>
              <div className="flex gap-4 mb-2">
                <div>
                  <p className="text-lg font-bold text-white">{stats?.total_indicados || 0}</p>
                  <p className="text-[9px] text-slate-400">Indicados</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">{stats?.indicacoes_disponiveis || 0}</p>
                  <p className="text-[9px] text-slate-400">Disponíveis</p>
                </div>
              </div>
              <Progress value={Math.min(referralProgress, 100)} className="h-1 bg-slate-800" />
              <Button onClick={() => navigate('/referrals')} size="sm" className="w-full mt-2 bg-orange-600 hover:bg-orange-700 h-7 text-[10px]">
                Ver Indicações
              </Button>
            </CardContent>
          </Card>

          {/* Gráfico */}
          <Card className="card-dashboard">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                <span className="text-xs font-medium text-white">7 dias</span>
              </div>
              <div style={{ width: '100%', height: 80 }}>
                {stats?.chart_data && stats.chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={stats.chart_data}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={8} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '10px' }}
                        formatter={(value) => [formatCurrency(value), "Valor"]}
                      />
                      <Area type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={1.5} fill="url(#colorValor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <p className="text-[10px]">Sem dados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== INFO CARDS ========== */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="p-1.5 rounded bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-sm font-bold text-white">{stats?.total_transacoes || 0}</p>
            <p className="text-[8px] text-slate-400">Transações</p>
          </div>
          <div className="p-1.5 rounded bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-sm font-bold text-white">{stats?.taxa_percentual || 2}%</p>
            <p className="text-[8px] text-slate-400">Taxa</p>
          </div>
          <div className="p-1.5 rounded bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-sm font-bold text-green-400 truncate">{formatCurrency(stats?.valor_hoje).replace('R$', '')}</p>
            <p className="text-[8px] text-slate-400">Hoje</p>
          </div>
          <div className="p-1.5 rounded bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-sm font-bold text-white truncate">{formatCurrency(stats?.total_recebido).replace('R$', '')}</p>
            <p className="text-[8px] text-slate-400">Total</p>
          </div>
        </div>

        {/* Push hint */}
        {!pushEnabled && isPushSupported() && (
          <div onClick={() => navigate('/settings')} className="flex items-center gap-2 p-2 rounded bg-purple-500/10 border border-purple-500/20 cursor-pointer">
            <Bell className="w-3 h-3 text-purple-400" />
            <p className="text-purple-300 text-[10px] flex-1">Ative as notificações push</p>
            <span className="text-purple-400 text-[10px]">→</span>
          </div>
        )}
      </div>

      {/* ========== MODAL DE DEPÓSITO ========== */}
      <Dialog open={showDepositModal} onOpenChange={closeDepositModal}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-400" />
              Depositar
            </DialogTitle>
          </DialogHeader>
          
          {!depositTransaction ? (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-slate-300 text-sm">Valor do depósito</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                  <Input
                    type="number"
                    min="10"
                    max="5000"
                    step="0.01"
                    placeholder="0,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pl-10 input-default"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Mínimo R$ 10,00 • Máximo R$ 5.000,00</p>
              </div>
              
              <Button
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {depositLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                Gerar PIX
              </Button>
            </div>
          ) : depositTransaction.status === "paid" ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Depósito Confirmado!</h3>
              <p className="text-2xl font-bold text-green-400 mb-4">{formatCurrency(depositTransaction.valor)}</p>
              <Button onClick={closeDepositModal} className="bg-green-600 hover:bg-green-700">
                Fechar
              </Button>
            </div>
          ) : depositTransaction.status === "expired" ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Timer className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PIX Expirado</h3>
              <p className="text-slate-400 text-sm mb-4">O tempo limite de {PIX_EXPIRATION_MINUTES} minutos foi excedido.</p>
              <Button onClick={closeDepositModal} className="bg-slate-700 hover:bg-slate-600">
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {/* Timer */}
              {depositTimeRemaining !== null && (
                <div className={`p-2 rounded-lg text-center ${depositTimeRemaining < 120 ? 'bg-red-500/20 border border-red-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
                  <div className="flex items-center justify-center gap-2">
                    <Timer className={`w-4 h-4 ${depositTimeRemaining < 120 ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className={`font-mono text-lg font-bold ${depositTimeRemaining < 120 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {String(Math.floor(depositTimeRemaining / 60)).padStart(2, '0')}:{String(depositTimeRemaining % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <div className="inline-block p-2 bg-white rounded-xl mb-2">
                  {depositTransaction.qr_code ? (
                    <img src={depositTransaction.qr_code} alt="QR Code" className="w-32 h-32" />
                  ) : (
                    <QrCode className="w-32 h-32 text-slate-300" />
                  )}
                </div>
                <p className="text-lg font-bold text-white">{formatCurrency(depositTransaction.valor)}</p>
              </div>
              
              {depositTransaction.pix_copia_cola && (
                <div className="p-2 bg-slate-800 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">PIX Copia e Cola</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={depositTransaction.pix_copia_cola}
                      readOnly
                      className="flex-1 bg-transparent border-none text-xs text-white truncate"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(depositTransaction.pix_copia_cola)}
                      className="h-7 px-2 border-slate-700"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Aguardando pagamento...</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
