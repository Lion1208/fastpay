import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import api from "../../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Users, CreditCard, Wallet, MessageSquare, TrendingUp, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get(`${API}/admin/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
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

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-dashboard">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
          <p className="text-slate-400">Visão geral do sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Usuários</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                  <p className="text-xs text-slate-500">{stats?.active_users || 0} ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Transações</p>
                  <p className="text-2xl font-bold text-white">{stats?.total_transactions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Volume Total</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(stats?.total_volume)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total em Taxas</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(stats?.total_taxas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-dashboard border-l-4 border-yellow-500">
            <CardContent className="p-4 flex items-center gap-4">
              <Wallet className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="font-medium text-white">Saques Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{stats?.pending_withdrawals || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard border-l-4 border-green-500">
            <CardContent className="p-4 flex items-center gap-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div>
                <p className="font-medium text-white">Total Sacável da Rede</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(stats?.total_sacavel_rede)}</p>
                <p className="text-xs text-slate-500">Disponível para saque</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard border-l-4 border-cyan-500">
            <CardContent className="p-4 flex items-center gap-4">
              <MessageSquare className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="font-medium text-white">Tickets Abertos</p>
                <p className="text-2xl font-bold text-cyan-400">{stats?.open_tickets || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white">Volume (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chart_data || []}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      formatter={(value) => [formatCurrency(value), "Volume"]}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white">Transações (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chart_data || []}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
