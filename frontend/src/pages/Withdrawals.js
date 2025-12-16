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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus,
  AlertCircle,
  Loader2,
  MessageSquare
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Withdrawals() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [stats, setStats] = useState(null);
  const [taxaSaque, setTaxaSaque] = useState(1.5);
  const [valorMinimo, setValorMinimo] = useState(10);
  const [calculoSaque, setCalculoSaque] = useState(null);
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
      setTaxaSaque(withdrawalsRes.data.taxa_saque || 1.5);
      setValorMinimo(withdrawalsRes.data.valor_minimo || 10);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    const valor = parseFloat(newWithdrawal.valor);
    if (!valor || valor < valorMinimo) {
      setCalculoSaque(null);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/withdrawals/calculate?valor=${valor}`);
      setCalculoSaque(response.data);
    } catch (error) {
      console.error("Error calculating:", error);
    }
  };

  useEffect(() => {
    if (newWithdrawal.valor) {
      const timer = setTimeout(handleCalculate, 300);
      return () => clearTimeout(timer);
    } else {
      setCalculoSaque(null);
    }
  }, [newWithdrawal.valor]);

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

    if (calculoSaque && !calculoSaque.pode_sacar) {
      toast.error(`Saldo insuficiente. Você precisa de ${formatCurrency(calculoSaque.valor_necessario)}`);
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/withdrawals`, {
        valor: valor,
        chave_pix: newWithdrawal.chave_pix,
        tipo_chave: newWithdrawal.tipo_chave
      });
      setWithdrawals([response.data, ...withdrawals]);
      setNewWithdrawal({ valor: "", chave_pix: "", tipo_chave: "cpf" });
      setCalculoSaque(null);
      setShowDialog(false);
      toast.success("Solicitação de saque enviada!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao solicitar saque");
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetails = async (withdrawal) => {
    try {
      const response = await axios.get(`${API}/withdrawals/${withdrawal.id}`);
      setSelectedWithdrawal(response.data);
      setShowDetailDialog(true);
    } catch (error) {
      setSelectedWithdrawal(withdrawal);
      setShowDetailDialog(true);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Aprovado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejeitado</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  const totalDisponivel = (stats?.saldo_disponivel || 0) + (stats?.saldo_comissoes || 0);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Saques</h1>
            <p className="text-slate-400">Solicite saques do seu saldo disponível</p>
          </div>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Saque
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-white">Solicitar Saque</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Saldo Disponível */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Saldo Disponível</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(totalDisponivel)}</p>
                  <p className="text-xs text-slate-500 mt-1">Taxa de saque: {taxaSaque}%</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Valor do Saque (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Mínimo R$10,00"
                    value={newWithdrawal.valor}
                    onChange={(e) => setNewWithdrawal({ ...newWithdrawal, valor: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    min="10"
                    step="0.01"
                  />
                </div>

                {/* Cálculo da Taxa */}
                {calculoSaque && (
                  <div className={`p-4 rounded-lg border ${calculoSaque.pode_sacar ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor solicitado:</span>
                        <span className="text-white">{formatCurrency(calculoSaque.valor_solicitado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Taxa ({calculoSaque.taxa_percentual}%):</span>
                        <span className="text-red-400">+{formatCurrency(calculoSaque.valor_taxa)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-300 font-medium">Você precisa ter:</span>
                        <span className={`font-bold ${calculoSaque.pode_sacar ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(calculoSaque.valor_necessario)}
                        </span>
                      </div>
                    </div>
                    {!calculoSaque.pode_sacar && (
                      <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Saldo insuficiente
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo de Chave PIX</Label>
                  <Select
                    value={newWithdrawal.tipo_chave}
                    onValueChange={(value) => setNewWithdrawal({ ...newWithdrawal, tipo_chave: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
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
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <Button 
                  onClick={handleCreate} 
                  disabled={creating || (calculoSaque && !calculoSaque.pode_sacar)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Solicitar Saque"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Saldo Disponível para Saque</p>
                <p className="text-xl font-bold text-white">{formatCurrency(totalDisponivel)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Importantes */}
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-yellow-400 font-medium">Informações Importantes sobre Saques</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• <strong>Taxa de saque:</strong> {taxaSaque}% sobre o valor solicitado</li>
                  <li>• <strong>Processamento:</strong> Saques são analisados manualmente</li>
                  <li>• <strong>Horário:</strong> Análises começam às 8h da manhã</li>
                  <li>• <strong>Prazo:</strong> Pode levar até 8 horas úteis para aprovação</li>
                  <li>• <strong>Importante:</strong> Você precisa ter saldo suficiente para cobrir o valor + taxa</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals List */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors"
                    onClick={() => handleViewDetails(withdrawal)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-700">
                          <ArrowUpRight className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {formatCurrency(withdrawal.valor_solicitado || withdrawal.valor)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(withdrawal.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        {getStatusBadge(withdrawal.status)}
                        {withdrawal.observacoes?.length > 0 && (
                          <MessageSquare className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum saque solicitado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Detalhes do Saque</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor Solicitado:</span>
                    <span className="text-white font-bold">
                      {formatCurrency(selectedWithdrawal.valor_solicitado || selectedWithdrawal.valor)}
                    </span>
                  </div>
                  {selectedWithdrawal.valor_taxa && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa ({selectedWithdrawal.taxa_percentual}%):</span>
                      <span className="text-red-400">{formatCurrency(selectedWithdrawal.valor_taxa)}</span>
                    </div>
                  )}
                  {selectedWithdrawal.valor_total_retido && (
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Total Retido:</span>
                      <span className="text-white">{formatCurrency(selectedWithdrawal.valor_total_retido)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Chave PIX:</span>
                    <span className="text-white text-sm">{selectedWithdrawal.chave_pix}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data:</span>
                    <span className="text-white text-sm">
                      {new Date(selectedWithdrawal.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* Observações */}
                {selectedWithdrawal.observacoes?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-slate-300 font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Observações do Admin
                    </p>
                    <div className="space-y-2">
                      {selectedWithdrawal.observacoes.map((obs, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <p className="text-white text-sm">{obs.observacao}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {obs.admin_nome} - {new Date(obs.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedWithdrawal.motivo && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm font-medium">Motivo da rejeição:</p>
                    <p className="text-white text-sm mt-1">{selectedWithdrawal.motivo}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
