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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Code, Plus, Copy, Trash2, Key, ExternalLink } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ApiIntegration() {
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await axios.get(`${API}/api-keys`);
      setKeys(response.data.keys);
    } catch (error) {
      toast.error("Erro ao carregar chaves");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("Informe um nome para a chave");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/api-keys?name=${encodeURIComponent(newKeyName)}`);
      setKeys([response.data, ...keys]);
      setNewKeyName("");
      setShowDialog(false);
      toast.success("Chave criada! Guarde-a em local seguro.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar chave");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (keyId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta chave?")) return;

    try {
      await axios.delete(`${API}/api-keys/${keyId}`);
      setKeys(keys.filter(k => k.id !== keyId));
      toast.success("Chave removida");
    } catch (error) {
      toast.error("Erro ao remover chave");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const codeExample = `// Criar transação via API
const response = await fetch('${process.env.REACT_APP_BACKEND_URL}/api/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUA_API_KEY'
  },
  body: JSON.stringify({
    valor: 100.00,
    cpf_cnpj: '12345678900',
    descricao: 'Pagamento de teste'
  })
});

const data = await response.json();
console.log(data.qr_code); // QR Code PIX`;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="api-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Integração API</h1>
            <p className="text-slate-400">Gerencie suas chaves de API</p>
          </div>
          
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="new-key-btn">
                <Plus className="mr-2 h-4 w-4" />
                Nova Chave
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Nova Chave API</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nome da Chave</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Produção, Teste, Meu App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="input-default"
                    data-testid="key-name"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full btn-primary"
                  data-testid="create-key-btn"
                >
                  {creating ? <div className="spinner w-5 h-5" /> : "Criar Chave"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Keys List */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-green-400" />
              Suas Chaves API
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner w-8 h-8"></div>
              </div>
            ) : keys.length > 0 ? (
              <div className="space-y-3">
                {keys.map((key) => (
                  <div 
                    key={key.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{key.name}</p>
                        <Badge className={key.status === "active" ? "badge-success" : "badge-error"}>
                          {key.status === "active" ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="mono text-sm text-slate-400 truncate">{key.key}</code>
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Criada em {new Date(key.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(key.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      data-testid={`delete-key-${key.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma chave API criada</p>
                <p className="text-sm text-slate-600 mt-1">Crie uma chave para integrar com seu sistema</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-cyan-400" />
              Exemplo de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
                <code className="text-sm text-slate-300">{codeExample}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(codeExample)}
                className="absolute top-2 right-2 p-2 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h4 className="font-medium text-white mb-2">Endpoints Disponíveis</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-slate-400">
                    <code className="text-green-400">POST</code> /api/transactions - Criar transação
                  </li>
                  <li className="text-slate-400">
                    <code className="text-cyan-400">GET</code> /api/transactions - Listar transações
                  </li>
                  <li className="text-slate-400">
                    <code className="text-cyan-400">GET</code> /api/transactions/:id - Detalhe
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h4 className="font-medium text-white mb-2">Webhook</h4>
                <p className="text-sm text-slate-400 mb-2">
                  Configure um webhook para receber notificações de pagamentos:
                </p>
                <code className="text-xs text-slate-500 mono">
                  POST seu-servidor.com/webhook
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
