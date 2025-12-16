import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { 
  ArrowLeftRight, 
  Search, 
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  AlertCircle,
  Plus,
  Star
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Transfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carteiraId, setCarteiraId] = useState("");
  const [taxaTransferencia, setTaxaTransferencia] = useState(0.5);
  const [frequentes, setFrequentes] = useState([]);
  const [generatingWallet, setGeneratingWallet] = useState(false);
  
  // Form
  const [valor, setValor] = useState("");
  const [carteiraDestino, setCarteiraDestino] = useState("");
  const [destinatario, setDestinatario] = useState(null);
  const [calculoTransfer, setCalculoTransfer] = useState(null);
  
  // Dialogs
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransfers();
    fetchFrequentes();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await axios.get(`${API}/transfers`);
      setTransfers(response.data.transfers || []);
      setCarteiraId(response.data.carteira_id || "");
      setTaxaTransferencia(response.data.taxa_transferencia || 0.5);
    } catch (error) {
      toast.error("Erro ao carregar transferências");
    } finally {
      setLoading(false);
    }
  };

  const fetchFrequentes = async () => {
    try {
      const response = await axios.get(`${API}/transfers/frequent`);
      setFrequentes(response.data.frequentes || []);
    } catch (error) {
      console.error("Error fetching frequents:", error);
    }
  };

  const handleGenerateWallet = async () => {
    setGeneratingWallet(true);
    try {
      const response = await axios.post(`${API}/user/generate-wallet`);
      setCarteiraId(response.data.carteira_id);
      toast.success("ID de carteira gerado com sucesso!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao gerar carteira");
    } finally {
      setGeneratingWallet(false);
    }
  };

  const handleSelectFrequent = (freq) => {
    setCarteiraDestino(freq.carteira_id);
    setDestinatario({ nome: freq.nome, carteira_id: freq.carteira_id });
  };

  // Busca automática ao digitar carteira
  const [searchingWallet, setSearchingWallet] = useState(false);
  
  useEffect(() => {
    if (!carteiraDestino || carteiraDestino.length < 5) {
      setDestinatario(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearchingWallet(true);
      try {
        const response = await axios.get(`${API}/transfers/validate/${carteiraDestino}`);
        setDestinatario(response.data);
      } catch (error) {
        setDestinatario(null);
      } finally {
        setSearchingWallet(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [carteiraDestino]);

  // Polling para notificações de transferências recebidas
  const [lastTransferCount, setLastTransferCount] = useState(0);
  
  useEffect(() => {
    const checkNewTransfers = async () => {
      try {
        const response = await axios.get(`${API}/transfers`);
        const currentTransfers = response.data.transfers || [];
        const receivedTransfers = currentTransfers.filter(t => t.destinatario_id === user?.id);
        
        if (lastTransferCount > 0 && receivedTransfers.length > lastTransferCount) {
          const newTransfer = receivedTransfers[0];
          toast.success(
            `Você recebeu ${formatCurrency(newTransfer.valor_recebido)} de ${newTransfer.remetente_nome}!`,
            { duration: 5000 }
          );
          setTransfers(currentTransfers);
        }
        setLastTransferCount(receivedTransfers.length);
      } catch (error) {
        console.error("Error checking transfers:", error);
      }
    };
    
    // Verifica a cada 10 segundos
    const interval = setInterval(checkNewTransfers, 10000);
    
    return () => clearInterval(interval);
  }, [lastTransferCount, user?.id]);

  const handleCalculate = async () => {
    if (!valor || parseFloat(valor) < 1) {
      toast.error("Valor mínimo é R$1,00");
      return;
    }
    
    if (!destinatario) {
      toast.error("Valide a carteira de destino primeiro");
      return;
    }
    
    try {
      const response = await axios.get(`${API}/transfers/calculate?valor=${parseFloat(valor)}`);
      setCalculoTransfer(response.data);
      setShowConfirmDialog(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao calcular transferência");
    }
  };

  const handleConfirmTransfer = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      await axios.post(`${API}/transfers`, {
        valor: parseFloat(valor),
        carteira_destino: carteiraDestino
      });
      
      setSuccess(true);
      setTimeout(() => {
        setShowConfirmDialog(false);
        setSuccess(false);
        setValor("");
        setCarteiraDestino("");
        setDestinatario(null);
        setCalculoTransfer(null);
        fetchTransfers();
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.detail || "Erro ao processar transferência");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Transferências</h1>
            <p className="text-slate-400">Transfira saldo para outros usuários</p>
          </div>
        </div>

        {/* Minha Carteira */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Wallet className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Sua Carteira</p>
                  {carteiraId ? (
                    <p className="text-lg font-bold text-white font-mono">{carteiraId}</p>
                  ) : (
                    <p className="text-sm text-yellow-400">Carteira não gerada</p>
                  )}
                </div>
              </div>
              {carteiraId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(carteiraId)}
                  className="border-slate-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateWallet}
                  disabled={generatingWallet}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {generatingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Gerar Carteira</>}
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Taxa de transferência: {taxaTransferencia}%
            </p>
          </CardContent>
        </Card>

        {/* Envios Frequentes */}
        {frequentes.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <p className="text-sm text-slate-300">Envios Frequentes</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {frequentes.map((freq, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectFrequent(freq)}
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    <span className="truncate max-w-[100px]">{freq.nome}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de Transferência */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-green-400" />
              Nova Transferência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">ID da Carteira de Destino</Label>
                <div className="relative">
                  <Input
                    placeholder="Ex: W1A2B3C4D5E6"
                    value={carteiraDestino}
                    onChange={(e) => setCarteiraDestino(e.target.value.toUpperCase())}
                    className="bg-slate-800 border-slate-700 text-white font-mono pr-10"
                  />
                  {searchingWallet && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>
                {destinatario && (
                  <p className="text-sm text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {destinatario.nome}
                  </p>
                )}
                {carteiraDestino && carteiraDestino.length >= 5 && !destinatario && !searchingWallet && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Carteira não encontrada
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="Mínimo R$1,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>
            
            <Button
              onClick={handleCalculate}
              disabled={!destinatario || !valor}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Continuar
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Transferências */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Histórico de Transferências</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : transfers.length > 0 ? (
              <div className="space-y-3">
                {transfers.map((transfer) => {
                  const isOutgoing = transfer.remetente_id === user?.id;
                  return (
                    <div
                      key={transfer.id}
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isOutgoing ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                          {isOutgoing ? (
                            <ArrowUpRight className="w-5 h-5 text-red-400" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {isOutgoing ? `Para: ${transfer.destinatario_nome}` : `De: ${transfer.remetente_nome}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(transfer.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isOutgoing ? 'text-red-400' : 'text-green-400'}`}>
                          {isOutgoing ? '-' : '+'}{formatCurrency(isOutgoing ? transfer.valor_enviado : transfer.valor_recebido)}
                        </p>
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          Concluída
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma transferência realizada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Confirmação */}
        <Dialog open={showConfirmDialog} onOpenChange={(open) => {
          if (!processing) setShowConfirmDialog(open);
        }}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {success ? "Transferência Enviada!" : processing ? "Processando..." : "Confirmar Transferência"}
              </DialogTitle>
            </DialogHeader>
            
            {success ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-green-400 font-medium">Transferência realizada com sucesso!</p>
              </div>
            ) : processing ? (
              <div className="py-8 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
                <p className="text-slate-400">Processando transferência...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destinatário:</span>
                      <span className="text-white font-medium">{destinatario?.nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Carteira:</span>
                      <span className="text-white font-mono text-sm">{carteiraDestino}</span>
                    </div>
                    <div className="border-t border-slate-700 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor enviado:</span>
                        <span className="text-white">{formatCurrency(calculoTransfer?.valor_enviado)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Taxa ({calculoTransfer?.taxa_percentual}%):</span>
                        <span className="text-red-400">-{formatCurrency(calculoTransfer?.valor_taxa)}</span>
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t border-slate-700">
                        <span className="text-slate-400">Valor que chegará:</span>
                        <span className="text-green-400 font-bold">{formatCurrency(calculoTransfer?.valor_recebido)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!calculoTransfer?.pode_transferir && (
                    <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                      <p className="text-yellow-400 text-sm">Saldo insuficiente para esta transferência</p>
                    </div>
                  )}
                </div>
                
                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                    className="border-slate-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmTransfer}
                    disabled={!calculoTransfer?.pode_transferir}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Confirmar Transferência
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
