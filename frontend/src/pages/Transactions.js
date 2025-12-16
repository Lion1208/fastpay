import { useState, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { 
  Plus, 
  Search, 
  Copy,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Loader2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newTx, setNewTx] = useState({ valor: "", cpf_cnpj: "", descricao: "" });
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Polling quando QR dialog está aberto com transação pendente
  useEffect(() => {
    if (showQrDialog && selectedTx && selectedTx.status === "pending") {
      setCheckingPayment(true);
      
      pollingRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/transactions/${selectedTx.id}/status`);
          if (response.data.status === "paid") {
            setSelectedTx(prev => ({ ...prev, status: "paid" }));
            setTransactions(prev => prev.map(t => 
              t.id === selectedTx.id ? { ...t, status: "paid" } : t
            ));
            setCheckingPayment(false);
            clearInterval(pollingRef.current);
            toast.success("Pagamento confirmado!");
          }
        } catch (error) {
          console.error("Error checking payment:", error);
        }
      }, 5000);
      
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    } else {
      setCheckingPayment(false);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [showQrDialog, selectedTx]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data.transactions);
    } catch (error) {
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTx.valor || parseFloat(newTx.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/transactions`, {
        valor: parseFloat(newTx.valor),
        cpf_cnpj: newTx.cpf_cnpj || null,
        descricao: newTx.descricao || null
      });
      
      setTransactions([response.data, ...transactions]);
      setNewTx({ valor: "", cpf_cnpj: "", descricao: "" });
      setShowNewDialog(false);
      setSelectedTx(response.data);
      setShowQrDialog(true);
      toast.success("Transação criada com sucesso!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar transação");
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="badge-success">Pago</Badge>;
      case "pending":
        return <Badge className="badge-warning">Pendente</Badge>;
      case "cancelled":
        return <Badge className="badge-error">Cancelado</Badge>;
      default:
        return <Badge className="badge-info">{status}</Badge>;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.cpf_cnpj?.includes(searchTerm)
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="transactions-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Transações</h1>
            <p className="text-slate-400">Gerencie seus pagamentos PIX</p>
          </div>
          
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-transaction-btn">
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Nova Transação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Valor (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={newTx.valor}
                    onChange={(e) => setNewTx({ ...newTx, valor: e.target.value })}
                    className="input-default"
                    data-testid="tx-valor"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">CPF/CNPJ do Pagador (opcional)</Label>
                  <Input
                    type="text"
                    placeholder="000.000.000-00"
                    value={newTx.cpf_cnpj}
                    onChange={(e) => setNewTx({ ...newTx, cpf_cnpj: e.target.value })}
                    className="input-default"
                    data-testid="tx-cpf"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Descrição (opcional)</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Pagamento de serviço"
                    value={newTx.descricao}
                    onChange={(e) => setNewTx({ ...newTx, descricao: e.target.value })}
                    className="input-default"
                    data-testid="tx-descricao"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={creating}
                  className="w-full btn-primary"
                  data-testid="create-tx-btn"
                >
                  {creating ? <div className="spinner w-5 h-5" /> : "Gerar QR Code PIX"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-default pl-10"
            data-testid="search-transactions"
          />
        </div>

        {/* Transactions List */}
        <Card className="card-dashboard">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8"></div>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-500 font-medium p-4">ID</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Descrição</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Valor</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Taxa</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Status</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Data</th>
                      <th className="text-right text-xs text-slate-500 font-medium p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="table-row">
                        <td className="p-4">
                          <span className="mono text-xs text-slate-400">{tx.id.substring(0, 8)}...</span>
                        </td>
                        <td className="p-4">
                          <span className="text-white">{tx.descricao || "Pagamento PIX"}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-white font-medium">{formatCurrency(tx.valor)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-slate-400 text-sm">{formatCurrency(tx.taxa_total)}</span>
                        </td>
                        <td className="p-4">{getStatusBadge(tx.status)}</td>
                        <td className="p-4">
                          <span className="text-slate-400 text-sm">
                            {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {tx.pix_copia_cola && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { setSelectedTx(tx); setShowQrDialog(true); }}
                              className="text-slate-400 hover:text-white"
                              data-testid={`view-qr-${tx.id}`}
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma transação encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">QR Code PIX</DialogTitle>
            </DialogHeader>
            {selectedTx && (
              <div className="space-y-4 mt-4">
                <div className="text-center">
                  <div className="inline-block p-4 bg-white rounded-xl">
                    {selectedTx.qr_code ? (
                      <img 
                        src={selectedTx.qr_code} 
                        alt="QR Code PIX" 
                        className="w-48 h-48"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-slate-100">
                        <QrCode className="w-24 h-24 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white mt-4">
                    {formatCurrency(selectedTx.valor)}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">{selectedTx.descricao || "Pagamento PIX"}</p>
                </div>
                
                {selectedTx.pix_copia_cola && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">PIX Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedTx.pix_copia_cola}
                        readOnly
                        className="input-default mono text-xs"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(selectedTx.pix_copia_cola)}
                        className="border-slate-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2 py-2">
                  {selectedTx.status === "paid" ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">Pagamento Confirmado!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      {checkingPayment ? (
                        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                      <span className="text-yellow-400">
                        {checkingPayment ? "Verificando pagamento..." : "Aguardando pagamento..."}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
