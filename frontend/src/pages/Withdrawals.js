import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus,
  AlertCircle,
  Loader2,
  MessageSquare,
  Smartphone,
  Download,
  Copy,
  Edit,
  Bitcoin,
  Banknote,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function Withdrawals() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSideSwapDialog, setShowSideSwapDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [stats, setStats] = useState(null);
  const [taxaSaque, setTaxaSaque] = useState(1.5);
  const [taxaSaqueDepix, setTaxaSaqueDepix] = useState(2.0);
  const [valorMinimo, setValorMinimo] = useState(10);
  const [sideswapWallet, setSideswapWallet] = useState(null);
  const [calculoSaque, setCalculoSaque] = useState(null);
  const [savingWallet, setSavingWallet] = useState(false);
  const [walletInput, setWalletInput] = useState("");
  const [metodoSaque, setMetodoSaque] = useState("pix");
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
        api.get(`/withdrawals`),
        api.get(`/dashboard/stats`)
      ]);
      setWithdrawals(withdrawalsRes.data.withdrawals);
      setTaxaSaque(withdrawalsRes.data.taxa_saque ?? 1.5);
      setTaxaSaqueDepix(withdrawalsRes.data.taxa_saque_depix ?? 2.0);
      setValorMinimo(withdrawalsRes.data.valor_minimo ?? 10);
      setSideswapWallet(withdrawalsRes.data.sideswap_wallet);
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
      const response = await api.get(`/withdrawals/calculate?valor=${valor}&metodo=${metodoSaque}`);
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
  }, [newWithdrawal.valor, metodoSaque]);

  const handleCreate = async () => {
    const valor = parseFloat(newWithdrawal.valor);
    
    if (!valor || valor < valorMinimo) {
      toast.error(`Valor mínimo de saque é ${formatCurrency(valorMinimo)}`);
      return;
    }

    if (metodoSaque === "pix" && !newWithdrawal.chave_pix) {
      toast.error("Informe a chave PIX");
      return;
    }

    if (metodoSaque === "depix" && !sideswapWallet) {
      toast.error("Vincule uma carteira SideSwap primeiro");
      return;
    }

    if (calculoSaque && !calculoSaque.pode_sacar) {
      toast.error(`Saldo insuficiente. Você precisa de ${formatCurrency(calculoSaque.valor_necessario)}`);
      return;
    }

    setCreating(true);
    try {
      const payload = {
        valor: valor,
        metodo: metodoSaque
      };

      if (metodoSaque === "pix") {
        payload.chave_pix = newWithdrawal.chave_pix;
        payload.tipo_chave = newWithdrawal.tipo_chave;
      }

      const response = await api.post(`/withdrawals`, payload);
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

  const handleSaveWallet = async () => {
    if (!walletInput || walletInput.length < 20) {
      toast.error("Endereço de carteira inválido");
      return;
    }

    setSavingWallet(true);
    try {
      await api.post('/sideswap/wallet', { wallet_address: walletInput });
      setSideswapWallet(walletInput);
      setShowSideSwapDialog(false);
      setWalletInput("");
      toast.success("Carteira SideSwap vinculada!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao vincular carteira");
    } finally {
      setSavingWallet(false);
    }
  };

  const handleViewDetails = async (withdrawal) => {
    try {
      const response = await api.get(`/withdrawals/${withdrawal.id}`);
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

  const getMetodoBadge = (metodo) => {
    if (metodo === "depix") {
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">Depix</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">PIX</Badge>;
  };

  const totalDisponivel = (stats?.saldo_disponivel || 0) + (stats?.saldo_comissoes || 0);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Layout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Saques</h1>
            <p className="text-slate-400 text-sm">Solicite saques do seu saldo</p>
          </div>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Novo Saque
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-md mx-4 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-white">Solicitar Saque</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2 overflow-hidden">
                {/* Saldo Disponível */}
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-400">Saldo de Vendas</p>
                    <p className="text-sm font-semibold text-white">{formatCurrency(stats?.saldo_disponivel || 0)}</p>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-400">Saldo de Comissões</p>
                    <p className="text-sm font-semibold text-amber-400">{formatCurrency(stats?.saldo_comissoes || 0)}</p>
                  </div>
                  <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between items-center">
                    <p className="text-xs text-slate-400 font-medium">Total Sacável</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(totalDisponivel)}</p>
                  </div>
                </div>

                {/* Método de Saque */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Método de Saque</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMetodoSaque("pix")}
                      className={`p-3 rounded-lg border transition-all ${
                        metodoSaque === "pix" 
                          ? "bg-green-500/20 border-green-500" 
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <Banknote className={`w-5 h-5 mx-auto mb-1 ${metodoSaque === "pix" ? "text-green-400" : "text-slate-400"}`} />
                      <p className={`text-xs font-medium ${metodoSaque === "pix" ? "text-green-400" : "text-slate-300"}`}>PIX</p>
                      <p className="text-[10px] text-slate-500">Taxa: {taxaSaque}%</p>
                    </button>
                    <button
                      onClick={() => setMetodoSaque("depix")}
                      className={`p-3 rounded-lg border transition-all ${
                        metodoSaque === "depix" 
                          ? "bg-orange-500/20 border-orange-500" 
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <Bitcoin className={`w-5 h-5 mx-auto mb-1 ${metodoSaque === "depix" ? "text-orange-400" : "text-slate-400"}`} />
                      <p className={`text-xs font-medium ${metodoSaque === "depix" ? "text-orange-400" : "text-slate-300"}`}>Depix</p>
                      <p className="text-[10px] text-slate-500">Taxa: {taxaSaqueDepix}%</p>
                    </button>
                  </div>
                </div>

                {/* Depix - Carteira SideSwap */}
                {metodoSaque === "depix" && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    {sideswapWallet ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-orange-300">Carteira Vinculada:</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-orange-400 flex-shrink-0"
                            onClick={() => {
                              setWalletInput(sideswapWallet);
                              setShowSideSwapDialog(true);
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" /> Editar
                          </Button>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded w-full max-w-full">
                          <p 
                            className="text-white text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap" 
                            style={{ maxWidth: '100%' }}
                            title={sideswapWallet}
                          >
                            {sideswapWallet}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <AlertCircle className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                        <p className="text-orange-300 text-sm mb-2">Nenhuma carteira vinculada</p>
                        <Button 
                          size="sm"
                          onClick={() => setShowSideSwapDialog(true)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Vincular SideSwap
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Valor do Saque (R$)</Label>
                  <Input
                    type="number"
                    placeholder={`Mínimo ${formatCurrency(valorMinimo)}`}
                    value={newWithdrawal.valor}
                    onChange={(e) => setNewWithdrawal({ ...newWithdrawal, valor: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    min={valorMinimo}
                    step="0.01"
                  />
                </div>

                {/* Cálculo da Taxa */}
                {calculoSaque && (
                  <div className={`p-3 rounded-lg border text-sm ${calculoSaque.pode_sacar ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-xs">Valor solicitado:</span>
                        <span className="text-white text-xs">{formatCurrency(calculoSaque.valor_solicitado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-xs">Taxa ({calculoSaque.taxa_percentual}%):</span>
                        <span className="text-red-400 text-xs">+{formatCurrency(calculoSaque.valor_taxa)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-700">
                        <span className="text-slate-300 text-xs font-medium">Você precisa ter:</span>
                        <span className={`text-xs font-bold ${calculoSaque.pode_sacar ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(calculoSaque.valor_necessario)}
                        </span>
                      </div>
                    </div>
                    {!calculoSaque.pode_sacar && (
                      <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Saldo insuficiente
                      </p>
                    )}
                  </div>
                )}

                {/* PIX Fields */}
                {metodoSaque === "pix" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Tipo de Chave PIX</Label>
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
                      <Label className="text-slate-300 text-sm">Chave PIX</Label>
                      <Input
                        type="text"
                        placeholder="Digite sua chave PIX"
                        value={newWithdrawal.chave_pix}
                        onChange={(e) => setNewWithdrawal({ ...newWithdrawal, chave_pix: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </>
                )}

                <Button 
                  onClick={handleCreate} 
                  disabled={creating || (calculoSaque && !calculoSaque.pode_sacar) || (metodoSaque === "depix" && !sideswapWallet)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar Saque"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Wallet className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Saldo Disponível</p>
                <p className="text-lg font-bold text-white">{formatCurrency(totalDisponivel)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações */}
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-yellow-400 font-medium text-sm">Informações</p>
                <ul className="text-[11px] text-slate-300 space-y-0.5">
                  <li>• <strong>Valor mínimo:</strong> {formatCurrency(valorMinimo)}</li>
                  <li>• <strong>Taxa PIX:</strong> {taxaSaque}% | <strong>Taxa Depix:</strong> {taxaSaqueDepix}%</li>
                  <li>• <strong>Prazo PIX:</strong> Até 8 horas para processamento</li>
                  <li>• <strong>Prazo Depix:</strong> Até 5 horas para processamento</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals List */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm text-white">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-colors"
                    onClick={() => handleViewDetails(withdrawal)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-slate-700">
                          <ArrowUpRight className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {formatCurrency(withdrawal.valor_solicitado || withdrawal.valor)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(withdrawal.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getMetodoBadge(withdrawal.metodo)}
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">Nenhum saque solicitado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-sm mx-4">
            <DialogHeader>
              <DialogTitle className="text-white text-sm">Detalhes do Saque</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Valor:</span>
                    <span className="text-white font-bold">
                      {formatCurrency(selectedWithdrawal.valor_solicitado || selectedWithdrawal.valor)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Método:</span>
                    {getMetodoBadge(selectedWithdrawal.metodo)}
                  </div>
                  {selectedWithdrawal.valor_taxa && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Taxa ({selectedWithdrawal.taxa_percentual}%):</span>
                      <span className="text-red-400 text-xs">{formatCurrency(selectedWithdrawal.valor_taxa)}</span>
                    </div>
                  )}
                  {selectedWithdrawal.metodo === "pix" && selectedWithdrawal.chave_pix && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Chave PIX:</span>
                      <span className="text-white text-xs truncate max-w-[150px]">{selectedWithdrawal.chave_pix}</span>
                    </div>
                  )}
                  {selectedWithdrawal.metodo === "depix" && selectedWithdrawal.sideswap_wallet && (
                    <div>
                      <span className="text-slate-400 text-xs">Carteira SideSwap:</span>
                      <p className="text-white text-[10px] font-mono bg-slate-900 p-1 rounded mt-1 truncate">
                        {selectedWithdrawal.sideswap_wallet}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400 text-xs">Status:</span>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>

                {selectedWithdrawal.observacoes?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-slate-300 text-xs font-medium flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Observações
                    </p>
                    {selectedWithdrawal.observacoes.map((obs, idx) => (
                      <div key={idx} className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                        <p className="text-white text-xs">{obs.observacao}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{obs.admin_nome}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedWithdrawal.motivo && (
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-xs font-medium">Motivo da rejeição:</p>
                    <p className="text-white text-xs mt-1">{selectedWithdrawal.motivo}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* SideSwap Wallet Dialog */}
        <Dialog open={showSideSwapDialog} onOpenChange={setShowSideSwapDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-orange-400" />
                Vincular Carteira SideSwap
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Tutorial */}
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-orange-400 font-medium text-sm mb-2">Como obter sua carteira:</p>
                <ol className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                    <span>Instale o app <strong>SideSwap</strong> no seu dispositivo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                    <span>Abra o app e clique em <strong>"Receber"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                    <span>Gere uma <strong>carteira normal</strong> (L-BTC)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">4</span>
                    <span><strong>Copie o endereço</strong> e cole abaixo</span>
                  </li>
                </ol>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-orange-500/30 text-orange-400"
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=io.sideswap', '_blank')}
                  >
                    <Download className="w-3 h-3 mr-1" /> Android
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-orange-500/30 text-orange-400"
                    onClick={() => window.open('https://apps.apple.com/us/app/sideswap/id1556476417', '_blank')}
                  >
                    <Download className="w-3 h-3 mr-1" /> iOS
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Endereço da Carteira</Label>
                <Input
                  type="text"
                  placeholder="Cole o endereço aqui..."
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                />
                <p className="text-[10px] text-slate-500">
                  O endereço começa com "lq1" ou "ex1" e tem aproximadamente 42-62 caracteres
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSideSwapDialog(false)}
                  className="flex-1 border-slate-700"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveWallet}
                  disabled={savingWallet || !walletInput}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {savingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
