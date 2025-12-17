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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Code, Plus, Copy, Trash2, Key, ExternalLink, Terminal, FileJson } from "lucide-react";


export default function ApiIntegration() {
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [activeTab, setActiveTab] = useState("keys");

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await api.get(`/api-keys`);
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
      const response = await api.post(`/api-keys?name=${encodeURIComponent(newKeyName)}`);
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
      await api.delete(`/api-keys/${keyId}`);
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

  // URL fixa para documentação da API
  const baseUrl = "https://fastpixgo.com";

  const codeExamples = {
    create: `// Criar transação PIX
const response = await fetch('${baseUrl}/api/v1/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUA_API_KEY'
  },
  body: JSON.stringify({
    amount: 100.00,
    description: 'Pagamento de serviço',
    payer_name: 'João Silva',
    payer_cpf_cnpj: '12345678900',
    custom_id: 'pedido_123' // opcional
  })
});

const data = await response.json();
console.log(data);
// {
//   id: "uuid",
//   amount: 100.00,
//   status: "pending",
//   qr_code: "...",
//   qr_code_base64: "...",
//   pix_copy_paste: "...",
//   custom_id: "pedido_123",
//   created_at: "2024-01-01T00:00:00Z"
// }`,
    get: `// Consultar transação
const response = await fetch('${baseUrl}/api/v1/transactions/{transaction_id}', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer SUA_API_KEY'
  }
});

const data = await response.json();
// Retorna detalhes da transação incluindo status atualizado`,
    list: `// Listar transações
const response = await fetch('${baseUrl}/api/v1/transactions?status=paid&limit=50', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer SUA_API_KEY'
  }
});

const data = await response.json();
// { data: [...transações] }`,
    webhook: `// Exemplo de payload do webhook
{
  "event": "transaction.paid",
  "data": {
    "id": "uuid-da-transacao",
    "amount": 100.00,
    "status": "paid",
    "custom_id": "pedido_123",
    "paid_at": "2024-01-01T12:00:00Z"
  }
}`
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="api-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Integração API</h1>
            <p className="text-slate-400">Integre nosso sistema em suas aplicações</p>
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "keys" ? "bg-green-500/20 text-green-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <Key className="w-4 h-4 inline-block mr-2" />
            Chaves API
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "docs" ? "bg-green-500/20 text-green-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <FileJson className="w-4 h-4 inline-block mr-2" />
            Documentação
          </button>
        </div>

        {activeTab === "keys" && (
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
        )}

        {activeTab === "docs" && (
          <div className="space-y-6">
            {/* Base URL */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  Base URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <code className="mono text-green-400 flex-1">{baseUrl}/api/v1</code>
                  <button
                    onClick={() => copyToClipboard(`${baseUrl}/api/v1`)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Todas as requisições devem incluir o header <code className="text-green-400">Authorization: Bearer SUA_API_KEY</code>
                </p>
              </CardContent>
            </Card>

            {/* Endpoints */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="text-lg text-white">Endpoints Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500/20 text-green-400">POST</Badge>
                      <code className="text-white">/v1/transactions</code>
                    </div>
                    <p className="text-sm text-slate-400">Criar nova transação PIX</p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-cyan-500/20 text-cyan-400">GET</Badge>
                      <code className="text-white">/v1/transactions/:id</code>
                    </div>
                    <p className="text-sm text-slate-400">Consultar detalhes de uma transação</p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-cyan-500/20 text-cyan-400">GET</Badge>
                      <code className="text-white">/v1/transactions</code>
                    </div>
                    <p className="text-sm text-slate-400">Listar transações (aceita ?status=paid&limit=50)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Create Transaction */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-green-400" />
                  Criar Transação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
                    <code className="text-sm text-slate-300">{codeExamples.create}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(codeExamples.create)}
                    className="absolute top-2 right-2 p-2 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Consultar Transação */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" />
                  Consultar Transação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
                    <code className="text-sm text-slate-300">{codeExamples.get}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(codeExamples.get)}
                    className="absolute top-2 right-2 p-2 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Webhook */}
            <Card className="card-dashboard">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  Webhook (Notificações)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">
                  Configure seu servidor para receber notificações quando pagamentos forem confirmados.
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto">
                    <code className="text-sm text-slate-300">{codeExamples.webhook}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(codeExamples.webhook)}
                    className="absolute top-2 right-2 p-2 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
