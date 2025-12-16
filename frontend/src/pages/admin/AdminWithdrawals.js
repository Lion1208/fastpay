import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Wallet, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await axios.get(`${API}/admin/withdrawals`);
      setWithdrawals(response.data.withdrawals);
    } catch (error) {
      toast.error("Erro ao carregar saques");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setProcessing(true);
    try {
      await axios.put(`${API}/admin/withdrawals/${selectedWithdrawal.id}`, {
        status: action,
        motivo: action === "rejected" ? rejectReason : null
      });
      
      setWithdrawals(withdrawals.map(w => 
        w.id === selectedWithdrawal.id ? { ...w, status: action } : w
      ));
      setShowDialog(false);
      setRejectReason("");
      toast.success(`Saque ${action === "approved" ? "aprovado" : "rejeitado"}!`);
    } catch (error) {
      toast.error("Erro ao processar saque");
    } finally {
      setProcessing(false);
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
            <Badge className="badge-warning text-lg px-4 py-2">
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Withdrawals Table */}
        <Card className="card-dashboard">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8"></div>
              </div>
            ) : withdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Parceiro</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Valor</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Chave PIX</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Status</th>
                      <th className="text-left text-xs text-slate-500 font-medium p-4">Data</th>
                      <th className="text-right text-xs text-slate-500 font-medium p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="table-row">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-white">{w.parceiro?.nome}</p>
                            <p className="text-sm text-slate-500 mono">{w.parceiro?.codigo}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-white font-semibold">{formatCurrency(w.valor)}</span>
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="text-xs text-slate-500">{w.tipo_chave?.toUpperCase()}</span>
                            <p className="text-white text-sm truncate max-w-[150px]">{w.chave_pix}</p>
                          </div>
                        </td>
                        <td className="p-4">{getStatusBadge(w.status)}</td>
                        <td className="p-4">
                          <span className="text-slate-500 text-sm">
                            {new Date(w.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedWithdrawal(w); setShowDialog(true); }}
                            className="text-slate-400 hover:text-white"
                            data-testid={`view-withdrawal-${w.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Detalhes do Saque</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-400">Valor Solicitado</span>
                    <span className="text-2xl font-bold text-white">{formatCurrency(selectedWithdrawal.valor)}</span>
                  </div>
                  {getStatusBadge(selectedWithdrawal.status)}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Parceiro</p>
                  <div className="p-3 rounded bg-slate-800/30">
                    <p className="font-medium text-white">{selectedWithdrawal.parceiro?.nome}</p>
                    <p className="text-sm text-slate-500">{selectedWithdrawal.parceiro?.email}</p>
                    <p className="text-sm text-green-400 mono">{selectedWithdrawal.parceiro?.codigo}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-slate-400">Chave PIX</p>
                  <div className="p-3 rounded bg-slate-800/30">
                    <p className="text-xs text-slate-500">{selectedWithdrawal.tipo_chave?.toUpperCase()}</p>
                    <p className="text-white mono break-all">{selectedWithdrawal.chave_pix}</p>
                  </div>
                </div>

                {selectedWithdrawal.status === "pending" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Motivo da Rejeição (opcional)</Label>
                      <Textarea
                        placeholder="Descreva o motivo caso vá rejeitar..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="input-default"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleAction("rejected")}
                        disabled={processing}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        data-testid="reject-withdrawal-btn"
                      >
                        {processing ? <div className="spinner w-4 h-4" /> : (
                          <>
                            <XCircle className="mr-2 w-4 h-4" />
                            Rejeitar
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleAction("approved")}
                        disabled={processing}
                        className="btn-primary"
                        data-testid="approve-withdrawal-btn"
                      >
                        {processing ? <div className="spinner w-4 h-4" /> : (
                          <>
                            <CheckCircle className="mr-2 w-4 h-4" />
                            Aprovar
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {selectedWithdrawal.motivo && (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">Motivo: {selectedWithdrawal.motivo}</p>
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
