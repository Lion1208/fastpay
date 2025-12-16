import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import api from "../../utils/api";
import { toast } from "sonner";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  MessageSquare,
  Send,
  Loader2
} from "lucide-react";


export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [newObservation, setNewObservation] = useState("");
  const [sendingObservation, setSendingObservation] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get(`/admin/withdrawals`);
      setWithdrawals(response.data.withdrawals);
    } catch (error) {
      toast.error("Erro ao carregar saques");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (withdrawal) => {
    try {
      const response = await api.get(`/admin/withdrawals/${withdrawal.id}`);
      setSelectedWithdrawal(response.data);
    } catch (error) {
      setSelectedWithdrawal(withdrawal);
    }
    setShowDialog(true);
  };

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      await api.put(`/admin/withdrawals/${selectedWithdrawal.id}`, {
        status: action,
        motivo: action === "rejected" ? rejectReason : null
      });
      
      setWithdrawals(withdrawals.map(w => 
        w.id === selectedWithdrawal.id ? { ...w, status: action } : w
      ));
      setShowDialog(false);
      setRejectReason("");
      toast.success(`Saque ${action === "approved" ? "aprovado" : "rejeitado"}!`);
      fetchWithdrawals();
    } catch (error) {
      toast.error("Erro ao processar saque");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendObservation = async () => {
    if (!newObservation.trim()) {
      toast.error("Digite uma observação");
      return;
    }
    
    setSendingObservation(true);
    try {
      const response = await api.post(`/admin/withdrawals/${selectedWithdrawal.id}/observation`, {
        observacao: newObservation.trim()
      });
      setSelectedWithdrawal(response.data);
      setNewObservation("");
      toast.success("Observação adicionada!");
    } catch (error) {
      toast.error("Erro ao adicionar observação");
    } finally {
      setSendingObservation(false);
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
        return <Badge>{status}</Badge>;
    }
  };

  const pendingCount = withdrawals.filter(w => w.status === "pending").length;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-withdrawals">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Saques</h1>
            <p className="text-slate-400">Aprove ou rejeite solicitações de saque</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-lg px-4 py-2">
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Withdrawals - Mobile Cards / Desktop Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : withdrawals.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                  {withdrawals.map((w) => (
                    <div 
                      key={w.id} 
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                      onClick={() => handleViewDetails(w)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{w.parceiro?.nome}</p>
                          <p className="text-xs text-green-400 font-mono">{w.parceiro?.codigo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(w.status)}
                          {w.observacoes?.length > 0 && (
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Valor</p>
                          <p className="text-white font-bold">{formatCurrency(w.valor_solicitado || w.valor)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Taxa</p>
                          <p className="text-slate-300">{w.taxa_percentual ? `${w.taxa_percentual}%` : '-'}</p>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500">Chave PIX ({w.tipo_chave?.toUpperCase()})</p>
                        <p className="text-white text-sm truncate">{w.chave_pix}</p>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{new Date(w.created_at).toLocaleDateString("pt-BR")}</span>
                        <Button variant="ghost" size="sm" className="text-slate-400 h-6 px-2">
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-800/50">
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Parceiro</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Valor</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Taxa</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Chave PIX</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Status</th>
                        <th className="text-left text-xs text-slate-400 font-medium p-4">Data</th>
                        <th className="text-right text-xs text-slate-400 font-medium p-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">{w.parceiro?.nome}</p>
                              <p className="text-sm text-slate-500 font-mono">{w.parceiro?.codigo}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-semibold">{formatCurrency(w.valor_solicitado || w.valor)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-400 text-sm">{w.taxa_percentual ? `${w.taxa_percentual}%` : '-'}</span>
                          </td>
                          <td className="p-4">
                            <div>
                              <span className="text-xs text-slate-500">{w.tipo_chave?.toUpperCase()}</span>
                              <p className="text-white text-sm truncate max-w-[150px]">{w.chave_pix}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(w.status)}
                              {w.observacoes?.length > 0 && <MessageSquare className="w-4 h-4 text-blue-400" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-500 text-sm">{new Date(w.created_at).toLocaleDateString("pt-BR")}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(w)} className="text-slate-400 hover:text-white">
                              <Eye className="w-4 h-4" />
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
                <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma solicitação de saque</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Detalhes do Saque</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
                {/* Info do Saque */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Valor Solicitado</span>
                    <span className="text-2xl font-bold text-white">
                      {formatCurrency(selectedWithdrawal.valor_solicitado || selectedWithdrawal.valor)}
                    </span>
                  </div>
                  {selectedWithdrawal.valor_taxa && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Taxa ({selectedWithdrawal.taxa_percentual}%)</span>
                        <span className="text-red-400">{formatCurrency(selectedWithdrawal.valor_taxa)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-400">Total Retido</span>
                        <span className="text-white font-medium">{formatCurrency(selectedWithdrawal.valor_total_retido)}</span>
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t border-slate-700">
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                </div>

                {/* Info do Parceiro */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <p className="text-sm text-slate-400">Parceiro</p>
                  <p className="text-white font-medium">{selectedWithdrawal.parceiro?.nome}</p>
                  <p className="text-green-400 font-mono text-sm">{selectedWithdrawal.parceiro?.codigo}</p>
                  <p className="text-slate-500 text-sm">{selectedWithdrawal.parceiro?.email}</p>
                </div>

                {/* Chave PIX */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <p className="text-sm text-slate-400">Chave PIX ({selectedWithdrawal.tipo_chave?.toUpperCase()})</p>
                  <p className="text-white font-mono break-all">{selectedWithdrawal.chave_pix}</p>
                </div>

                {/* Observações */}
                <div className="space-y-3">
                  <p className="text-slate-300 font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Observações
                  </p>
                  
                  {/* Lista de observações */}
                  {selectedWithdrawal.observacoes?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedWithdrawal.observacoes.map((obs, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <p className="text-white text-sm">{obs.observacao}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {obs.admin_nome} - {new Date(obs.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Nenhuma observação</p>
                  )}
                  
                  {/* Adicionar observação */}
                  {selectedWithdrawal.status === "pending" && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar observação..."
                        value={newObservation}
                        onChange={(e) => setNewObservation(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white flex-1"
                      />
                      <Button
                        onClick={handleSendObservation}
                        disabled={sendingObservation}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {sendingObservation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ações */}
                {selectedWithdrawal.status === "pending" && (
                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Motivo da rejeição (opcional)</Label>
                      <Textarea
                        placeholder="Motivo caso rejeite..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleAction("approved")}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Aprovar</>}
                      </Button>
                      <Button
                        onClick={() => handleAction("rejected")}
                        disabled={processing}
                        variant="outline"
                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" /> Rejeitar</>}
                      </Button>
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
