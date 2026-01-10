import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Clock,
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
  Plus,
  ChevronRight,
  Banknote,
  PiggyBank
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

  const referralProgress = stats 
    ? (stats.valor_minimo_indicacao > 0 
        ? (stats.valor_movimentado / stats.valor_minimo_indicacao) * 100 
        : 100) 
    : 0;

  // Combinar transações e transferências para o extrato
  const getExtrato = () => {
    const items = [];
    
    // Transações recebidas
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
    
    // Transferências enviadas
    if (stats?.recent_transfers_sent) {
      stats.recent_transfers_sent.forEach(t => {
        items.push({
          id: t.id,
          tipo: 'saida',
          descricao: `Transferência para ${t.destinatario_nome}`,
          valor: -t.valor,
          status: 'paid',
          data: t.created_at,
          icon: ArrowUpRight,
          color: 'red'
        });
      });
    }
    
    // Transferências recebidas
    if (stats?.recent_transfers_received) {
      stats.recent_transfers_received.forEach(t => {
        items.push({
          id: t.id,
          tipo: 'entrada',
          descricao: `Transferência de ${t.remetente_nome}`,
          valor: t.valor_recebido,
          status: 'paid',
          data: t.created_at,
          icon: ArrowDownLeft,
          color: 'green'
        });
      });
    }
    
    // Comissões
    if (stats?.recent_commissions) {
      stats.recent_commissions.forEach(c => {
        items.push({
          id: c.id,
          tipo: 'comissao',
          descricao: `Comissão de ${c.indicado_nome || 'indicado'}`,
          valor: c.valor_comissao,
          status: 'paid',
          data: c.created_at,
          icon: DollarSign,
          color: 'purple'
        });
      });
    }
    
    // Ordenar por data
    return items.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 10);
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
      <div className="space-y-6 animate-fade-in" data-testid="dashboard">
        
        {/* ========== SEÇÃO PRINCIPAL - SALDO ========== */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm">Olá, {user?.nome?.split(" ")[0]}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-500 text-xs">Código:</span>
                  <span className="mono text-green-400 font-medium text-sm">{user?.codigo}</span>
                  <button onClick={() => copyToClipboard(user?.codigo)} className="text-slate-500 hover:text-white">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <button
                onClick={toggleBalance}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Saldo Principal */}
            <div className="mb-6">
              <p className="text-slate-400 text-sm mb-1">Saldo Total</p>
              <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                {showBalance ? formatCurrency(saldoTotal) : "R$ •••••••"}
              </p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-green-400" />
                  <span className="text-slate-400 text-xs">Disponível</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {showBalance ? formatCurrency(stats?.saldo_disponivel) : "•••••"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-400 text-xs">Comissões</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {showBalance ? formatCurrency(stats?.saldo_comissoes) : "•••••"}
                </p>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => navigate('/transactions')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <QrCode className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-xs text-slate-300">Cobrar</span>
              </button>
              
              <button
                onClick={() => navigate('/transfers')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-xs text-slate-300">Transferir</span>
              </button>
              
              <button
                onClick={() => navigate('/withdrawals')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banknote className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-xs text-slate-300">Sacar</span>
              </button>
              
              <button
                onClick={() => window.open(`/p/${user?.codigo}`, '_blank')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Link2 className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-xs text-slate-300">Meu Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========== LINK DE PAGAMENTO ========== */}
        <Card className="card-dashboard border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Link2 className="w-5 h-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">Seu Link de Pagamento</p>
                  <p className="text-slate-400 text-xs truncate">{window.location.origin}/p/{user?.codigo}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(`${window.location.origin}/p/${user?.codigo}`)}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/p/${user?.codigo}`, '_blank')}
                  className="border-slate-700 text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== EXTRATO ========== */}
        <Card className="card-dashboard">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                Extrato
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
                Ver tudo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {extrato.length > 0 ? (
              <div className="space-y-1">
                {extrato.map((item, index) => {
                  const IconComponent = item.icon;
                  const isPositive = item.valor >= 0;
                  return (
                    <div 
                      key={`${item.id}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.color === 'green' ? 'bg-green-500/20' :
                          item.color === 'red' ? 'bg-red-500/20' :
                          item.color === 'purple' ? 'bg-purple-500/20' :
                          'bg-slate-700'
                        }`}>
                          <IconComponent className={`w-5 h-5 ${
                            item.color === 'green' ? 'text-green-400' :
                            item.color === 'red' ? 'text-red-400' :
                            item.color === 'purple' ? 'text-purple-400' :
                            'text-slate-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.descricao}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.data).toLocaleDateString("pt-BR", {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(item.valor)}
                        </p>
                        {item.status === 'pending' && (
                          <Badge variant="outline" className="badge-warning text-xs">Pendente</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma movimentação ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== GRID: INDICAÇÕES + GRÁFICO ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card de Indicações */}
          <Card className="card-dashboard">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                Indicações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-2xl font-bold text-white">{stats?.total_indicados || 0}</p>
                    <p className="text-xs text-slate-400">Indicados</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-2xl font-bold text-green-400">{stats?.indicacoes_disponiveis || 0}</p>
                    <p className="text-xs text-slate-400">Disponíveis</p>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400">Progresso para liberar</span>
                    <span className="text-white">{Math.min(referralProgress, 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(referralProgress, 100)} className="h-2 bg-slate-800" />
                  <p className="text-xs text-slate-500 mt-2">
                    {formatCurrency(stats?.valor_movimentado)} / {formatCurrency(stats?.valor_minimo_indicacao)}
                  </p>
                </div>

                {/* CTA */}
                <Button 
                  onClick={() => navigate('/referrals')} 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Ver Indicações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico */}
          <Card className="card-dashboard lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Movimentação (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 200, minHeight: 200 }}>
                {stats?.chart_data && stats.chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={stats.chart_data}>
                      <defs>
                        <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value) => [formatCurrency(value), "Valor"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="valor" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        fill="url(#colorValor)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    <div className="text-center">
                      <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sem dados de movimentação</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== CARD DE COMISSÕES ========== */}
        <Card className="card-dashboard border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Suas Comissões</p>
                  <p className="text-slate-400 text-sm">
                    Total acumulado: {formatCurrency(stats?.total_comissoes_recebidas || stats?.saldo_comissoes)}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/commissions')} 
                variant="outline" 
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                Ver Detalhes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ========== INFORMAÇÕES ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <p className="text-slate-400 text-xs mb-1">Transações</p>
            <p className="text-xl font-bold text-white">{stats?.total_transacoes || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <p className="text-slate-400 text-xs mb-1">Taxa</p>
            <p className="text-xl font-bold text-white">{stats?.taxa_percentual || 2}%</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <p className="text-slate-400 text-xs mb-1">Hoje</p>
            <p className="text-xl font-bold text-green-400">{formatCurrency(stats?.valor_hoje)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <p className="text-slate-400 text-xs mb-1">Total Recebido</p>
            <p className="text-xl font-bold text-white">{formatCurrency(stats?.total_recebido)}</p>
          </div>
        </div>

        {/* Push Notification Hint */}
        {!pushEnabled && isPushSupported() && (
          <div 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-colors"
          >
            <Bell className="w-5 h-5 text-purple-400" />
            <div className="flex-1">
              <p className="text-purple-300 text-sm font-medium">Ative as notificações push</p>
              <p className="text-slate-500 text-xs">Receba alertas de transferências mesmo com o navegador fechado</p>
            </div>
            <span className="text-purple-400 text-sm">Ativar →</span>
          </div>
        )}
      </div>
    </Layout>
  );
}
