import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import api from "../../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Shield, 
  UserPlus, 
  UserMinus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";


export default function AdminTeam() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamRes, usersRes] = await Promise.all([
        api.get(`/admin/team`),
        api.get(`/admin/users`)
      ]);
      setAdmins(teamRes.data.admins || []);
      setUsers(usersRes.data.users?.filter(u => u.role !== "admin") || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    try {
      await api.post(`/admin/team/promote/${selectedUser.id}`);
      toast.success(`${selectedUser.nome} foi promovido a administrador!`);
      setShowAddDialog(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao promover usuário");
    } finally {
      setProcessing(false);
    }
  };

  const handleDemote = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    try {
      await api.delete(`/admin/team/demote/${selectedUser.id}`);
      toast.success(`${selectedUser.nome} foi removido da administração`);
      setShowRemoveDialog(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao remover admin");
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Equipe Admin</h1>
            <p className="text-slate-400">Gerencie os administradores da sua rede</p>
          </div>
          
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Promover Usuário
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium">Sobre a Equipe Admin</p>
                <p className="text-sm text-slate-400 mt-1">
                  Você pode promover usuários da sua rede a administradores. Cada admin terá acesso 
                  às configurações e poderá gerenciar apenas sua própria rede de usuários. 
                  As configurações de taxas, nome do sistema e API são independentes para cada admin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admins List */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Administradores da Sua Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : admins.length > 0 ? (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Shield className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{admin.nome}</p>
                        <p className="text-sm text-slate-500">{admin.email}</p>
                        <p className="text-xs text-green-400 font-mono">{admin.codigo}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedUser(admin); setShowRemoveDialog(true); }}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum admin promovido ainda</p>
                <p className="text-xs text-slate-600 mt-1">
                  Promova usuários da sua rede para ajudar na administração
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Admin Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Promover Usuário a Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <Input
                  placeholder="Buscar usuário por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'bg-green-500/20 border-green-500/50'
                          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{user.nome}</p>
                          <p className="text-xs text-slate-500">{user.codigo}</p>
                        </div>
                        {selectedUser?.id === user.id && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">Nenhum usuário encontrado</p>
                )}
              </div>
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  O usuário terá acesso total às configurações da rede dele
                </p>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setShowAddDialog(false); setSelectedUser(null); }}
                  className="border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePromote}
                  disabled={!selectedUser || processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Promover a Admin"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Admin Dialog */}
        <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">Remover Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-slate-400">
                Tem certeza que deseja remover <strong className="text-white">{selectedUser?.nome}</strong> da administração?
              </p>
              <p className="text-sm text-slate-500">
                O usuário perderá acesso ao painel administrativo e suas configurações serão removidas.
              </p>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setShowRemoveDialog(false); setSelectedUser(null); }}
                  className="border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDemote}
                  disabled={processing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover Admin"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
