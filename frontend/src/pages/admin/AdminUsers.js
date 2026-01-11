import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import api from "../../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Edit, Users, Ban, Trash2, Unlock, Loader2, AlertTriangle } from "lucide-react";
import { Textarea } from "../../components/ui/textarea";


export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    taxa_percentual: "",
    taxa_fixa: "",
    taxa_saque: "",
    taxa_transferencia: "",
    valor_minimo_saque: "",
    valor_minimo_transferencia: "",
    indicacoes_liberadas: "",
    status: "",
    comissao_indicacao_individual: ""
  });
  
  // Block/Delete dialogs
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get(`/admin/users`);
      setUsers(response.data.users);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditData({
      taxa_percentual: user.taxa_percentual?.toString() || "2",
      taxa_fixa: user.taxa_fixa?.toString() || "0.99",
      taxa_saque: user.taxa_saque?.toString() || "1.5",
      taxa_transferencia: user.taxa_transferencia?.toString() || "0.5",
      valor_minimo_saque: user.valor_minimo_saque?.toString() || "10",
      valor_minimo_transferencia: user.valor_minimo_transferencia?.toString() || "1",
      indicacoes_liberadas: user.indicacoes_liberadas?.toString() || "0",
      status: user.status || "active",
      comissao_indicacao_individual: user.comissao_indicacao_individual?.toString() || ""
    });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatePayload = {
        taxa_percentual: parseFloat(editData.taxa_percentual),
        taxa_fixa: parseFloat(editData.taxa_fixa),
        taxa_saque: parseFloat(editData.taxa_saque),
        taxa_transferencia: parseFloat(editData.taxa_transferencia),
        valor_minimo_saque: parseFloat(editData.valor_minimo_saque),
        valor_minimo_transferencia: parseFloat(editData.valor_minimo_transferencia),
        indicacoes_liberadas: parseInt(editData.indicacoes_liberadas),
        status: editData.status
      };
      
      // Adiciona comissão individual apenas se preenchida
      if (editData.comissao_indicacao_individual !== "") {
        updatePayload.comissao_indicacao_individual = parseFloat(editData.comissao_indicacao_individual);
      } else {
        updatePayload.comissao_indicacao_individual = null; // Remove comissão individual
      }
      
      const response = await api.put(`/admin/users/${selectedUser.id}`, updatePayload);
      
      setUsers(users.map(u => u.id === selectedUser.id ? response.data : u));
      setShowEditDialog(false);
      toast.success("Usuário atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const handleBlockUser = async () => {
    if (!blockReason.trim()) {
      toast.error("Digite o motivo do bloqueio");
      return;
    }
    
    setProcessing(true);
    try {
      await api.post(`/admin/users/${selectedUser.id}/block`, {
        motivo: blockReason.trim()
      });
      
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, status: "blocked", block_reason: blockReason } : u));
      setShowBlockDialog(false);
      setBlockReason("");
      setSelectedUser(null);
      toast.success("Usuário bloqueado!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao bloquear usuário");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnblockUser = async (user) => {
    try {
      await api.post(`/admin/users/${user.id}/unblock`);
      setUsers(users.map(u => u.id === user.id ? { ...u, status: "active", block_reason: null } : u));
      toast.success("Usuário desbloqueado!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao desbloquear usuário");
    }
  };

  const handleDeleteUser = async () => {
    setProcessing(true);
    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast.success("Usuário excluído!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao excluir usuário");
    } finally {
      setProcessing(false);
    }
  };

  const openBlockDialog = (user) => {
    setSelectedUser(user);
    setBlockReason("");
    setShowBlockDialog(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-users">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-slate-400">Gerencie os usuários do sistema</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nome, email ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-default pl-10"
            data-testid="search-users"
          />
        </div>

        {/* Users - Mobile Cards / Desktop Table */}
        <Card className="card-dashboard">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{user.nome}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                          <span className="mono text-green-400 text-sm">{user.codigo}</span>
                        </div>
                        <Badge className={
                          user.status === "active" ? "badge-success" : 
                          user.status === "blocked" ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                          "badge-error"
                        }>
                          {user.status === "active" ? "Ativo" : user.status === "blocked" ? "Bloqueado" : "Inativo"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs">Movimentado</p>
                          <p className="text-white font-medium">{formatCurrency(user.valor_movimentado)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Taxa</p>
                          <p className="text-slate-300">{user.taxa_percentual}% + R${user.taxa_fixa?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs">Indicações</p>
                          <p className="text-white">{user.indicacoes_usadas || 0}/{user.indicacoes_liberadas || 0}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t border-slate-700">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="flex-1 border-slate-600">
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </Button>
                        {user.status === "blocked" ? (
                          <Button size="sm" onClick={() => handleUnblockUser(user)} className="bg-green-600 hover:bg-green-700">
                            <Unlock className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openBlockDialog(user)} className="border-yellow-500/50 text-yellow-400">
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openDeleteDialog(user)} className="border-red-500/50 text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Usuário</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Código</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Movimentado</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Taxa</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Indicações</th>
                        <th className="text-left text-xs text-slate-500 font-medium p-4">Status</th>
                        <th className="text-right text-xs text-slate-500 font-medium p-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="table-row">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">{user.nome}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="mono text-green-400">{user.codigo}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{formatCurrency(user.valor_movimentado)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-400">{user.taxa_percentual}% + R${user.taxa_fixa?.toFixed(2)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{user.indicacoes_usadas || 0}/{user.indicacoes_liberadas || 0}</span>
                          </td>
                          <td className="p-4">
                            <Badge className={
                              user.status === "active" ? "badge-success" : 
                              user.status === "blocked" ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                              "badge-error"
                            }>
                              {user.status === "active" ? "Ativo" : user.status === "blocked" ? "Bloqueado" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="text-slate-400 hover:text-white" title="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                              {user.status === "blocked" ? (
                                <Button variant="ghost" size="sm" onClick={() => handleUnblockUser(user)} className="text-green-400 hover:text-green-300 hover:bg-green-500/10" title="Desbloquear">
                                  <Unlock className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => openBlockDialog(user)} className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10" title="Bloquear">
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(user)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
                <p className="text-slate-500">Nenhum usuário encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Editar Usuário</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="font-medium text-white">{selectedUser.nome}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  <p className="text-sm text-green-400 mono">{selectedUser.codigo}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Taxa Transação (%)</Label>
                    <Input
                      type="number"
                      value={editData.taxa_percentual}
                      onChange={(e) => setEditData({ ...editData, taxa_percentual: e.target.value })}
                      className="input-default"
                      step="0.1"
                      data-testid="edit-taxa-percentual"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Taxa Fixa (R$)</Label>
                    <Input
                      type="number"
                      value={editData.taxa_fixa}
                      onChange={(e) => setEditData({ ...editData, taxa_fixa: e.target.value })}
                      className="input-default"
                      step="0.01"
                      data-testid="edit-taxa-fixa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Taxa Saque PIX (%)</Label>
                    <Input
                      type="number"
                      value={editData.taxa_saque}
                      onChange={(e) => setEditData({ ...editData, taxa_saque: e.target.value })}
                      className="input-default"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Taxa Saque Depix (%)</Label>
                    <Input
                      type="number"
                      value={editData.taxa_saque_depix}
                      onChange={(e) => setEditData({ ...editData, taxa_saque_depix: e.target.value })}
                      className="input-default"
                      step="0.1"
                      placeholder="Padrão do sistema"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Taxa Transferência (%)</Label>
                    <Input
                      type="number"
                      value={editData.taxa_transferencia}
                      onChange={(e) => setEditData({ ...editData, taxa_transferencia: e.target.value })}
                      className="input-default"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Mín. Saque (R$)</Label>
                    <Input
                      type="number"
                      value={editData.valor_minimo_saque}
                      onChange={(e) => setEditData({ ...editData, valor_minimo_saque: e.target.value })}
                      className="input-default"
                      step="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Indicações Liberadas</Label>
                  <Input
                    type="number"
                    value={editData.indicacoes_liberadas}
                    onChange={(e) => setEditData({ ...editData, indicacoes_liberadas: e.target.value })}
                    className="input-default"
                    data-testid="edit-indicacoes"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Comissão Individual (%)</Label>
                  <Input
                    type="number"
                    value={editData.comissao_indicacao_individual}
                    onChange={(e) => setEditData({ ...editData, comissao_indicacao_individual: e.target.value })}
                    className="input-default"
                    step="0.1"
                    placeholder="Deixe vazio para usar padrão"
                    data-testid="edit-comissao-individual"
                  />
                  <p className="text-xs text-slate-500">Taxa de comissão que este usuário recebe por indicação. Deixe vazio para usar a taxa padrão do sistema.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(value) => setEditData({ ...editData, status: value })}
                  >
                    <SelectTrigger className="input-default">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full btn-primary"
                  data-testid="save-user-btn"
                >
                  {saving ? <div className="spinner w-5 h-5" /> : "Salvar Alterações"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Block Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-yellow-400" />
                Bloquear Usuário
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    O usuário não conseguirá fazer login e verá o motivo do bloqueio.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="font-medium text-white">{selectedUser.nome}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Motivo do bloqueio *</label>
                  <Textarea
                    placeholder="Ex: Atividade suspeita, violação dos termos..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowBlockDialog(false)}
                    className="flex-1 border-slate-700"
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleBlockUser}
                    disabled={processing || !blockReason.trim()}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Bloquear"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Excluir Usuário
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm font-medium mb-2">
                    ⚠️ Esta ação é irreversível!
                  </p>
                  <p className="text-slate-400 text-sm">
                    Serão excluídos: transações, transferências, saques, comissões, indicações e todos os dados do usuário.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="font-medium text-white">{selectedUser.nome}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  <p className="text-sm text-green-400 mono">{selectedUser.codigo}</p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                    className="flex-1 border-slate-700"
                    disabled={processing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDeleteUser}
                    disabled={processing}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir Permanentemente"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
