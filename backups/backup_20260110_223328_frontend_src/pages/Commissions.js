import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { DollarSign, TrendingUp, Wallet, Clock } from "lucide-react";


export default function Commissions() {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState({ comissao_indicacao: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissions();
    fetchConfig();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await api.get(`/commissions`);
      setData(response.data);
    } catch (error) {
      toast.error("Erro ao carregar comissões");
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get('/config/public');
      setConfig(response.data);
    } catch (error) {
      console.error("Erro ao carregar config");
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
      <div className="space-y-6 animate-fade-in" data-testid="commissions-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Comissões</h1>
          <p className="text-slate-400">Acompanhe seus ganhos com indicações</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(data?.saldo_comissoes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Ganho</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(data?.total_comissoes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total de Comissões</p>
                  <p className="text-2xl font-bold text-white">{data?.commissions?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="card-dashboard">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">Como funcionam as comissões?</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Você ganha <span className="text-green-400 font-medium">{config?.comissao_indicacao || 1}%</span> de todas as transações 
                  realizadas pelos usuários que você indicou. As comissões são creditadas automaticamente 
                  em seu saldo quando a transação é confirmada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions List */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white">Histórico de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.commissions?.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {data.commissions.map((com) => (
                    <div key={com.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="mono text-xs text-slate-500">{com.transacao_id?.substring(0, 8)}...</span>
                          <p className="text-green-400 font-bold text-lg">{formatCurrency(com.valor_comissao)}</p>
                        </div>
                        <Badge className={com.status === "credited" ? "badge-success" : "badge-warning"}>
                          {com.status === "credited" ? "Creditado" : "Pendente"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                        <div>
                          <p className="text-xs text-slate-500">Valor Transação</p>
                          <p className="text-white font-medium">{formatCurrency(com.valor_transacao)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Percentual</p>
                          <p className="text-slate-300">{com.percentual}%</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end text-xs text-slate-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(com.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Transação</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Valor da Transação</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Percentual</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Comissão</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Status</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.commissions.map((com) => (
                        <tr key={com.id} className="table-row">
                          <td className="p-4">
                            <span className="mono text-xs text-slate-400">{com.transacao_id?.substring(0, 8)}...</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{formatCurrency(com.valor_transacao)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-400">{com.percentual}%</span>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-medium">{formatCurrency(com.valor_comissao)}</span>
                          </td>
                          <td className="p-4">
                            <Badge className={com.status === "credited" ? "badge-success" : "badge-warning"}>
                              {com.status === "credited" ? "Creditado" : "Pendente"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-500 text-sm">
                              {new Date(com.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma comissão ainda</p>
                <p className="text-sm text-slate-600 mt-1">Indique amigos para começar a ganhar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
