import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, Plus } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Withdrawals() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [stats, setStats] = useState(null);
  const [newWithdrawal, setNewWithdrawal] = useState({
    valor: "",
    chave_pix: "",
    tipo_chave: "cpf"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [withdrawalsRes, statsRes] = await Promise.all([
        axios.get(`${API}/withdrawals`),
        axios.get(`${API}/dashboard/stats`)
      ]);
      setWithdrawals(withdrawalsRes.data.withdrawals);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const valor = parseFloat(newWithdrawal.valor);
    
    if (!valor || valor < 10) {
      toast.error("Valor mínimo de saque é R$10,00");
      return;
    }

    if (!newWithdrawal.chave_pix) {
      toast.error("Informe a chave PIX");
      return;
    }

    const totalDisponivel = (stats?.saldo_disponivel || 0) + (stats?.saldo_comissoes || 0);
    if (valor > totalDisponivel) {
      toast.error("Saldo insuficiente");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/withdrawals`, newWithdrawal);
      setWithdrawals([response.data, ...withdrawals]);
      setNewWithdrawal({ valor: "", chave_pix: "", tipo_chave: "cpf" });
      setShowDialog(false);
      toast.success("Solicitação de saque enviada!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao solicitar saque");
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Aprovado</Badge>;
      case "pending":
        return <Badge className="badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case "rejected":
        return <Badge className="badge-error flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalDisponivel = (stats?.saldo_disponivel || 0) + (stats?.saldo_comissoes || 0);

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
      <div className="space-y-6 animate-fade-in" data-testid="withdrawals-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Saques</h1>
            <p className="text-slate-400">Solicite a transferência do seu saldo</p>
          </div>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-withdrawal-btn">
                <Plus className="mr-2 h-4 w-4" />
                Solicitar Saque
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-white">Solicitar Saque</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(totalDisponivel)}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Valor do Saque</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={newWithdrawal.valor}
                    onChange={(e) => setNewWithdrawal({ ...newWithdrawal, valor: e.target.value })}
                    className="input-default"
                    data-testid="withdrawal-valor"
                  />
                  <p className="text-xs text-slate-500">Mínimo: R$10,00</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo de Chave PIX</Label>
                  <Select
                    value={newWithdrawal.tipo_chave}
                    onValueChange={(value) => setNewWithdrawal({ ...newWithdrawal, tipo_chave: value })}
                  >
                    <SelectTrigger className="input-default">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Chave PIX</Label>
                  <Input
                    type="text"
                    placeholder="Digite sua chave PIX"
                    value={newWithdrawal.chave_pix}
                    onChange={(e) => setNewWithdrawal({ ...newWithdrawal, chave_pix: e.target.value })}
                    className="input-default"
                    data-testid="withdrawal-chave"
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full btn-primary"
                  data-testid="create-withdrawal-btn"
                >
                  {creating ? <div className="spinner w-5 h-5" /> : "Solicitar Saque"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(stats?.saldo_disponivel)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Comissões</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(stats?.saldo_comissoes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total para Saque</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(totalDisponivel)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawals List */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white">Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-500 font-medium p-4">ID</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Valor</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Chave PIX</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Status</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="table-row">
                        <td className="p-4">
                          <span className="mono text-xs text-slate-400">{w.id.substring(0, 8)}...</span>
                        </td>
                        <td className="p-4">
                          <span className="text-white font-medium">{formatCurrency(w.valor)}</span>
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="text-slate-400 text-sm">{w.tipo_chave.toUpperCase()}</span>
                            <p className="text-white text-sm truncate max-w-[150px]">{w.chave_pix}</p>
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(w.status)}</td>
                        <td className="p-4">
                          <span className="text-slate-500 text-sm">
                            {new Date(w.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum saque solicitado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
