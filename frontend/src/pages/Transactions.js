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
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Loader2,
  RefreshCw
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
  const [newTx, setNewTx] = useState({ valor: "", cpf_cnpj: "", nome_pagador: "", descricao: "" });
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
    
    // Polling para atualizar lista de transações
    pollingRef.current = setInterval(fetchTransactions, 10000);
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data.transactions);
      
      // Atualiza selectedTx se estiver aberto
      if (selectedTx) {
        const updated = response.data.transactions.find(t => t.id === selectedTx.id);
        if (updated) setSelectedTx(updated);
      }
    } catch (error) {
      if (loading) toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTx.valor || parseFloat(newTx.valor) < 10) {
      toast.error("Valor mínimo é R$10,00");
      return;
    }

    if (!newTx.nome_pagador) {
      toast.error("Informe o nome do pagador");
      return;
    }

    if (!newTx.cpf_cnpj) {
      toast.error("Informe o CPF/CNPJ do pagador");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/transactions`, {
        valor: parseFloat(newTx.valor),
        cpf_cnpj: newTx.cpf_cnpj.replace(/\D/g, ""),
        nome_pagador: newTx.nome_pagador,
        descricao: newTx.descricao || null
      });
      
      setTransactions([response.data, ...transactions]);
      setNewTx({ valor: "", cpf_cnpj: "", nome_pagador: "", descricao: "" });
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

  const formatCpf = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Pago</Badge>;
      case "pending":
        return <Badge className="badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case "cancelled":
        return <Badge className="badge-error flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelado</Badge>;
      default:
        return <Badge className="badge-info">{status}</Badge>;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.nome_pagador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchTransactions}
              className="border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
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
                    <Label className="text-slate-300">Valor (R$) <span className="text-red-400">*</span></Label>
                    <Input
                      type="number"
                      placeholder="Mínimo R$10,00"
                      value={newTx.valor}
                      onChange={(e) => setNewTx({ ...newTx, valor: e.target.value })}
                      className="input-default"
                      min="10"
                      step="0.01"
                      data-testid="tx-valor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nome do Pagador <span className="text-red-400">*</span></Label>
                    <Input
                      type="text"
                      placeholder="Nome completo"
                      value={newTx.nome_pagador}
                      onChange={(e) => setNewTx({ ...newTx, nome_pagador: e.target.value })}
                      className="input-default"
                      data-testid="tx-nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">CPF/CNPJ do Pagador <span className="text-red-400">*</span></Label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={newTx.cpf_cnpj}
                      onChange={(e) => setNewTx({ ...newTx, cpf_cnpj: formatCpf(e.target.value) })}
                      className="input-default"
                      maxLength={18}
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
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nome, CPF ou descrição..."
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
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Nome</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">CPF/CNPJ</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Valor</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Status</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Data</th>
                      <th className="text-right text-xs text-slate-500 font-medium p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="table-row">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-white">{tx.nome_pagador || "-"}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[150px]">{tx.descricao || "Pagamento PIX"}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-slate-400 mono text-sm">{tx.cpf_cnpj || "-"}</span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-white font-medium">{formatCurrency(tx.valor)}</p>
                            <p className="text-xs text-slate-500">Líquido: {formatCurrency(tx.valor_liquido)}</p>
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(tx.status)}</td>
                        <td className="p-4">
                          <div>
                            <p className="text-slate-400 text-sm">
                              {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(tx.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => { setSelectedTx(tx); setShowQrDialog(true); }}
                            className="text-slate-400 hover:text-white"
                            data-testid={`view-qr-${tx.id}`}
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
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
              <DialogTitle className="text-white">Detalhes da Transação</DialogTitle>
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
                </div>

                {/* Info do pagador */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Nome:</span>
                    <span className="text-white text-sm">{selectedTx.nome_pagador || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">CPF/CNPJ:</span>
                    <span className="text-white text-sm mono">{selectedTx.cpf_cnpj || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Data:</span>
                    <span className="text-white text-sm">
                      {new Date(selectedTx.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
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
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/30 w-full justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">Pagamento Confirmado!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 w-full justify-center">
                      <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                      <span className="text-yellow-400">Aguardando pagamento...</span>
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
