import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
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
  ArrowDownRight,
  Clock,
  Copy,
  ExternalLink,
  Bell
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useNavigate } from "react-router-dom";
import { isPushSupported, isSubscribedToPush } from "../utils/push";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

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
      const response = await axios.get(`${API}/dashboard/stats`);
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

  const referralProgress = stats ? (stats.valor_movimentado / stats.valor_minimo_indicacao) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="dashboard">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Olá, {user?.nome?.split(" ")[0]}!
            </h1>
            <p className="text-slate-400 mt-1">
              Confira suas estatísticas e movimentações
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
            <span className="text-slate-400 text-sm">Seu código:</span>
            <span className="mono text-green-400 font-semibold">{user?.codigo}</span>
            <button
              onClick={() => copyToClipboard(user?.codigo)}
              className="text-slate-400 hover:text-white transition-colors"
              data-testid="copy-code-btn"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-stat group" data-testid="stat-saldo">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-400" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-sm text-slate-400">Saldo Disponível</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(stats?.saldo_disponivel)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-stat group" data-testid="stat-comissoes">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm text-slate-400">Comissões</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(stats?.saldo_comissoes)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-stat group" data-testid="stat-transacoes">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xs text-slate-500">Total</span>
              </div>
              <p className="text-sm text-slate-400">Transações</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats?.total_transacoes || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="card-stat group" data-testid="stat-indicados">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
                <span className="text-xs text-slate-500">{stats?.indicacoes_disponiveis || 0} disp.</span>
              </div>
              <p className="text-sm text-slate-400">Indicados</p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats?.total_indicados || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Progress & Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referral Progress */}
          <Card className="card-dashboard" data-testid="referral-progress">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Liberação de Indicações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Progresso</span>
                    <span className="text-white font-medium">
                      {formatCurrency(stats?.valor_movimentado)} / {formatCurrency(stats?.valor_minimo_indicacao)}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(referralProgress, 100)} 
                    className="h-3 bg-slate-800"
                  />
                </div>
                
                {stats?.can_refer ? (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-green-400 font-medium">Indicações Liberadas!</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Você tem {stats?.indicacoes_disponiveis || 0} indicação(ões) disponível(eis)
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-slate-300 font-medium">Movimente mais para liberar</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Faltam {formatCurrency((stats?.valor_minimo_indicacao || 1000) - (stats?.valor_movimentado || 0))}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="card-dashboard lg:col-span-2" data-testid="chart-container">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Movimentação (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 min-h-[256px]">
                {stats?.chart_data && stats.chart_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
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
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
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
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Sem dados de movimentação</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="card-dashboard lg:col-span-2" data-testid="recent-transactions">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recent_transactions?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_transactions.slice(0, 5).map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.status === 'paid' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                          {tx.status === 'paid' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tx.descricao || "Pagamento PIX"}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">{formatCurrency(tx.valor)}</p>
                        <Badge 
                          variant="outline" 
                          className={tx.status === 'paid' ? 'badge-success' : 'badge-warning'}
                        >
                          {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma transação ainda</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="card-dashboard" data-testid="info-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Taxa por Transação</span>
                  <span className="text-white font-medium">
                    {stats?.taxa_percentual || 2}% + R${(stats?.taxa_fixa || 0.99).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Comissão Indicação</span>
                  <span className="text-white font-medium">1%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Total Recebido</span>
                  <span className="text-white font-medium">{formatCurrency(stats?.total_recebido)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-slate-400">Hoje</span>
                  <span className="text-green-400 font-medium">
                    {stats?.transacoes_hoje || 0} tx | {formatCurrency(stats?.valor_hoje)}
                  </span>
                </div>

                {/* Quick Link */}
                <a 
                  href={`${window.location.origin}/p/${user?.codigo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors mt-4"
                >
                  <ExternalLink size={16} />
                  Ver Página Pública
                </a>
              </div>
            </CardContent>
          </Card>
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
