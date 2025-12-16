import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Users, Copy, Link, Share2, TrendingUp, Lock, Unlock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Referrals() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await axios.get(`${API}/referrals`);
      setData(response.data);
    } catch (error) {
      toast.error("Erro ao carregar indicações");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const shareLink = () => {
    const url = `${window.location.origin}/register/${data?.codigo_indicacao}`;
    if (navigator.share) {
      navigator.share({ title: "Cadastre-se no FastPay", url });
    } else {
      copyToClipboard(url);
    }
  };

  const progress = data ? (data.valor_atual / data.valor_minimo_indicacao) * 100 : 0;

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
      <div className="space-y-6 animate-fade-in" data-testid="referrals-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Indicações</h1>
          <p className="text-slate-400">Indique amigos e ganhe comissões</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Indicados</p>
                  <p className="text-2xl font-bold text-white">{data?.referrals?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  {data?.can_refer ? (
                    <Unlock className="w-6 h-6 text-purple-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-purple-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Indicações Disponíveis</p>
                  <p className="text-2xl font-bold text-white">{data?.indicacoes_disponiveis || 0}</p>
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
                  <p className="text-sm text-slate-400">Movimentado</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(data?.valor_atual)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress & Share */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Card */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white">Progresso para Liberação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Meta: {formatCurrency(data?.valor_minimo_indicacao)}</span>
                    <span className="text-white font-medium">{Math.min(progress, 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-4 bg-slate-800" />
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50">
                  <p className="text-slate-300">
                    {data?.can_refer ? (
                      <>
                        <span className="text-green-400 font-medium">Parabéns!</span> Você pode indicar novos usuários.
                      </>
                    ) : (
                      <>
                        Movimente mais <span className="text-green-400 font-medium">
                          {formatCurrency((data?.valor_minimo_indicacao || 1000) - (data?.valor_atual || 0))}
                        </span> para liberar indicações.
                      </>
                    )}
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  <p>• Cada R$1.000 movimentados libera 1 indicação</p>
                  <p>• Você ganha 1% de todas as transações dos indicados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white">Seu Link de Indicação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Código de Indicação</p>
                  <div className="flex items-center justify-between">
                    <span className="mono text-xl text-green-400 font-bold">{data?.codigo_indicacao}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(data?.codigo_indicacao)}
                      data-testid="copy-codigo-btn"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Link de Cadastro</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/register/${data?.codigo_indicacao}`}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-slate-300 truncate"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/register/${data?.codigo_indicacao}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={shareLink}
                  disabled={!data?.can_refer || data?.indicacoes_disponiveis <= 0}
                  className="w-full btn-primary"
                  data-testid="share-btn"
                >
                  <Share2 className="mr-2 w-4 h-4" />
                  Compartilhar Link
                </Button>

                {(!data?.can_refer || data?.indicacoes_disponiveis <= 0) && (
                  <p className="text-center text-sm text-slate-500">
                    {!data?.can_refer ? "Movimente mais para liberar" : "Sem indicações disponíveis"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referrals List */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white">Seus Indicados</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.referrals?.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {data.referrals.map((ref) => (
                    <div key={ref.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{ref.indicado_nome}</p>
                          <p className="text-sm text-slate-500">{ref.indicado_email}</p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(ref.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700">
                        <div>
                          <p className="text-xs text-slate-500">Movimentado</p>
                          <p className="text-white font-medium">{formatCurrency(ref.total_movimentado)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Suas Comissões</p>
                          <p className="text-green-400 font-medium">{formatCurrency(ref.total_comissoes)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Nome</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Email</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Movimentado</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Suas Comissões</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrals.map((ref) => (
                        <tr key={ref.id} className="table-row">
                          <td className="p-4">
                            <span className="text-white font-medium">{ref.indicado_nome}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-400">{ref.indicado_email}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{formatCurrency(ref.total_movimentado)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-medium">{formatCurrency(ref.total_comissoes)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-500 text-sm">
                              {new Date(ref.created_at).toLocaleDateString("pt-BR")}
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
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Você ainda não tem indicados</p>
                <p className="text-sm text-slate-600 mt-1">Compartilhe seu link para começar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
