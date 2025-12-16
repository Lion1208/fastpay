import { useState, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  Search, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Loader2,
  RefreshCw,
  Filter,
  X,
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  Calendar
} from "lucide-react";


export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    total_transacoes: 0,
    volume_total: 0,
    valor_liquido_total: 0,
    transacoes_pagas: 0
  });
  const [loading, setLoading] = useState(true);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    status: "",
    data_inicial: "",
    data_final: "",
    busca: ""
  });
  const [activeFilters, setActiveFilters] = useState({
    status: "",
    data_inicial: "",
    data_final: "",
    busca: ""
  });
  
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
    
    pollingRef.current = setInterval(() => fetchTransactions(false), 15000);
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const fetchTransactions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilters.status) params.append("status", activeFilters.status);
      if (activeFilters.data_inicial) params.append("data_inicial", activeFilters.data_inicial);
      if (activeFilters.data_final) params.append("data_final", activeFilters.data_final);
      if (activeFilters.busca) params.append("busca", activeFilters.busca);
      params.append("limit", "500");
      
      const response = await api.get(`/transactions?${params.toString()}`);
      setTransactions(response.data.transactions);
      setStats(response.data.stats || {
        total_transacoes: 0,
        volume_total: 0,
        valor_liquido_total: 0,
        transacoes_pagas: 0
      });
      
      if (selectedTx) {
        const updated = response.data.transactions.find(t => t.id === selectedTx.id);
        if (updated) setSelectedTx(updated);
      }
    } catch (error) {
      if (showLoading) toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setActiveFilters({ ...filters });
    setTimeout(() => fetchTransactions(), 100);
  };

  const handleClearFilters = () => {
    const cleared = { status: "", data_inicial: "", data_final: "", busca: "" };
    setFilters(cleared);
    setActiveFilters(cleared);
    setTimeout(() => fetchTransactions(), 100);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelado</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const hasActiveFilters = activeFilters.status || activeFilters.data_inicial || activeFilters.data_final || activeFilters.busca;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="transactions-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Transações</h1>
            <p className="text-slate-400">Gerencie seus pagamentos PIX</p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => fetchTransactions()}
            className="border-slate-700 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Receipt className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total de Transações</p>
                  <p className="text-xl font-bold text-white">{stats.total_transacoes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Volume Total</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(stats.volume_total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Valor Líquido Total</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(stats.valor_liquido_total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Transações Pagas</p>
                  <p className="text-xl font-bold text-white">{stats.transacoes_pagas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Filtros</span>
              {hasActiveFilters && (
                <Badge className="bg-green-500/20 text-green-400 text-xs">Ativos</Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Status</Label>
                <Select value={filters.status || "all"} onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Data Inicial */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Data Inicial</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="date"
                    value={filters.data_inicial}
                    onChange={(e) => setFilters({ ...filters, data_inicial: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white pl-10"
                  />
                </div>
              </div>
              
              {/* Data Final */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Data Final</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="date"
                    value={filters.data_final}
                    onChange={(e) => setFilters({ ...filters, data_final: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white pl-10"
                  />
                </div>
              </div>
              
              {/* Buscar */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Buscar (CPF, Nome ou ID)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Digite para buscar..."
                    value={filters.busca}
                    onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white pl-10"
                    data-testid="search-transactions"
                  />
                </div>
              </div>
              
              {/* Botões */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400 opacity-0">Ações</Label>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleFilter}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Filtrar
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Transações */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : transactions.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                      onClick={() => { setSelectedTx(tx); setShowQrDialog(true); }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{tx.nome_pagador || "Sem nome"}</p>
                          <p className="text-xs text-slate-500 font-mono">{tx.cpf_cnpj || "-"}</p>
                        </div>
                        {getStatusBadge(tx.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Valor</p>
                          <p className="text-white font-bold">{formatCurrency(tx.valor)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Líquido</p>
                          <p className={`font-bold ${tx.valor_liquido < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(tx.valor_liquido)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">{tx.id.substring(0, 8)}...</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-500"
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(tx.id); }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(tx.created_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-800/50">
                        <th className="text-left text-xs text-slate-400 font-medium p-4">ID</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Usuário</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">CPF/CNPJ</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Valor</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Valor Líquido</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Data</th>
                        <th className="text-right text-xs text-slate-400 font-medium p-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-xs font-mono truncate max-w-[80px]" title={tx.id}>
                                {tx.id.substring(0, 8)}...
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 hover:text-white" onClick={() => copyToClipboard(tx.id)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-medium">{tx.nome_pagador || "-"}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-400 font-mono text-sm">{tx.cpf_cnpj || "-"}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-medium">{formatCurrency(tx.valor)}</span>
                          </td>
                          <td className="p-4">
                            <span className={`font-medium ${tx.valor_liquido < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(tx.valor_liquido)}</span>
                          </td>
                          <td className="p-4">{getStatusBadge(tx.status)}</td>
                          <td className="p-4">
                            <div>
                              <p className="text-slate-300 text-sm">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
                              <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedTx(tx); setShowQrDialog(true); }} className="text-slate-400 hover:text-white hover:bg-slate-800">
                              <QrCode className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma transação encontrada</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={handleClearFilters} className="text-green-400 mt-2">
                    Limpar filtros
                  </Button>
                )}
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
                  <p className="text-sm text-green-400">
                    Líquido: {formatCurrency(selectedTx.valor_liquido)}
                  </p>
                </div>

                {/* Info do pagador */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">ID:</span>
                    <span className="text-white text-sm font-mono text-xs">{selectedTx.id.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Nome:</span>
                    <span className="text-white text-sm">{selectedTx.nome_pagador || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">CPF/CNPJ:</span>
                    <span className="text-white text-sm font-mono">{selectedTx.cpf_cnpj || "-"}</span>
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
                        className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(selectedTx.pix_copia_cola)}
                        className="border-slate-700 hover:bg-slate-800"
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
