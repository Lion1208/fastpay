import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Wallet, 
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
  ChevronRight,
  Banknote,
  PiggyBank,
  Plus,
  Loader2,
  X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { isPushSupported, isSubscribedToPush } from "../utils/push";

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
      const response = await api.post('/transactions', {
        valor: valor,
        cpf_cnpj: user?.cpf || "00000000000",
        nome_pagador: user?.nome,
        descricao: "Depósito em carteira"
      });
      setDepositTransaction(response.data);
      toast.success("PIX gerado! Escaneie o QR Code");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao gerar depósito");
    } finally {
      setDepositLoading(false);
    }
  };

  // Polling para verificar pagamento do depósito
  useEffect(() => {
    if (depositTransaction && depositTransaction.status === "pending") {
      const interval = setInterval(async () => {
        try {
          const response = await api.get(`/transactions/${depositTransaction.id}/status`);
          if (response.data.status === "paid") {
            setDepositTransaction(prev => ({ ...prev, status: "paid" }));
            toast.success("Depósito confirmado!");
            fetchStats(); // Atualizar saldo
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
      <div className="space-y-4 animate-fade-in w-full max-w-full overflow-hidden" data-testid="dashboard">
        
        {/* ========== SALDO PRINCIPAL ========== */}
        <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-4 w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm truncate">Olá, {user?.nome?.split(" ")[0]}</p>
            <button onClick={toggleBalance} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 flex-shrink-0">
              {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Saldo */}
          <div className="mb-4">
            <p className="text-slate-500 text-xs">Saldo Total</p>
            <p className="text-2xl md:text-3xl font-bold text-white break-words">
              {showBalance ? formatCurrency(saldoTotal) : "R$ •••••"}
            </p>
          </div>

          {/* Breakdown */}
          <div className="flex gap-4 mb-4 text-sm flex-wrap">
            <div className="min-w-0">
              <p className="text-slate-500 text-xs">Disponível</p>
              <p className="text-white font-medium truncate">
                {showBalance ? formatCurrency(stats?.saldo_disponivel) : "•••"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs">Comissões</p>
              <p className="text-purple-400 font-medium truncate">
                {showBalance ? formatCurrency(stats?.saldo_comissoes) : "•••"}
              </p>
            </div>
          </div>

          {/* Ações Rápidas - 4 botões compactos */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 min-w-0"
              data-testid="btn-depositar"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-slate-300 truncate">Depositar</span>
            </button>
            
            <button
              onClick={() => navigate('/transfers')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 min-w-0"
              data-testid="btn-transferir"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-slate-300 truncate">Transferir</span>
            </button>
            
            <button
              onClick={() => navigate('/withdrawals')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 min-w-0"
              data-testid="btn-sacar"
            >
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 flex-shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-slate-300 truncate">Sacar</span>
            </button>
            
            <button
              onClick={() => navigate('/transactions')}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 min-w-0"
              data-testid="btn-cobrar"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 flex-shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-slate-300 truncate">Cobrar</span>
            </button>
          </div>
        </div>

        {/* ========== LINK DE PAGAMENTO ========== */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 w-full overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <Link2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 truncate">
              {window.location.origin}/p/{user?.codigo}
            </span>
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-2">
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${window.location.origin}/p/${user?.codigo}`)} className="h-7 px-2">
              <Copy className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(`/p/${user?.codigo}`, '_blank')} className="h-7 px-2">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* ========== EXTRATO ========== */}
        <Card className="card-dashboard">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Extrato
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {extrato.length > 0 ? (
              <div className="space-y-1">
                {extrato.map((item, index) => {
                  const IconComponent = item.icon;
                  const isPositive = item.valor >= 0;
                  return (
                    <div key={`${item.id}-${index}`} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.color === 'green' ? 'bg-green-500/20' :
                          item.color === 'red' ? 'bg-red-500/20' :
                          'bg-purple-500/20'
                        }`}>
                          <IconComponent className={`w-4 h-4 ${
                            item.color === 'green' ? 'text-green-400' :
                            item.color === 'red' ? 'text-red-400' :
                            'text-purple-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{item.descricao}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(item.data).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(item.valor)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">Nenhuma movimentação</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== INDICAÇÕES + GRÁFICO ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Indicações */}
          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-white">Indicações</span>
              </div>
              <div className="flex gap-4 mb-3">
                <div>
                  <p className="text-xl font-bold text-white">{stats?.total_indicados || 0}</p>
                  <p className="text-[10px] text-slate-400">Indicados</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-400">{stats?.indicacoes_disponiveis || 0}</p>
                  <p className="text-[10px] text-slate-400">Disponíveis</p>
                </div>
              </div>
              <Progress value={Math.min(referralProgress, 100)} className="h-1.5 bg-slate-800" />
              <Button onClick={() => navigate('/referrals')} size="sm" className="w-full mt-3 bg-orange-600 hover:bg-orange-700 h-8 text-xs">
                Ver Indicações
              </Button>
            </CardContent>
          </Card>

          {/* Gráfico */}
          <Card className="card-dashboard">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">7 dias</span>
              </div>
              <div style={{ width: '100%', height: 120 }}>
                {stats?.chart_data && stats.chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={stats.chart_data}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                        formatter={(value) => [formatCurrency(value), "Valor"]}
                      />
                      <Area type="monotone" dataKey="valor" stroke="#22c55e" strokeWidth={2} fill="url(#colorValor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <p className="text-xs">Sem dados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== INFO CARDS ========== */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-lg font-bold text-white">{stats?.total_transacoes || 0}</p>
            <p className="text-[9px] text-slate-400">Transações</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-lg font-bold text-white">{stats?.taxa_percentual || 2}%</p>
            <p className="text-[9px] text-slate-400">Taxa</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-lg font-bold text-green-400">{formatCurrency(stats?.valor_hoje).replace('R$', '')}</p>
            <p className="text-[9px] text-slate-400">Hoje</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
            <p className="text-lg font-bold text-white">{formatCurrency(stats?.total_recebido).replace('R$', '')}</p>
            <p className="text-[9px] text-slate-400">Total</p>
          </div>
        </div>

        {/* Push hint */}
        {!pushEnabled && isPushSupported() && (
          <div onClick={() => navigate('/settings')} className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 cursor-pointer">
            <Bell className="w-4 h-4 text-purple-400" />
            <p className="text-purple-300 text-xs flex-1">Ative as notificações push</p>
            <span className="text-purple-400 text-xs">→</span>
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
          ) : (
            <div className="space-y-4 mt-4">
              <div className="text-center">
                <div className="inline-block p-3 bg-white rounded-xl mb-3">
                  {depositTransaction.qr_code ? (
                    <img src={depositTransaction.qr_code} alt="QR Code" className="w-40 h-40" />
                  ) : (
                    <QrCode className="w-40 h-40 text-slate-300" />
                  )}
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(depositTransaction.valor)}</p>
                <p className="text-xs text-slate-400 mt-1">Escaneie o QR Code ou copie o código</p>
              </div>
              
              {depositTransaction.pix_copia_cola && (
                <div className="p-3 bg-slate-800 rounded-lg">
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
