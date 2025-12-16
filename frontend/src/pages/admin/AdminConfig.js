import { useState, useEffect } from "react";
import { Layout } from "../../components/Layout";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Settings, Key, Save, Eye, EyeOff, DollarSign } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/admin/config`);
      setConfig(response.data);
    } catch (error) {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${API}/admin/config`, config);
      setConfig(response.data);
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="admin-config">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-slate-400">Configure as opções do sistema</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FastDePix API */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-green-400" />
                API FastDePix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={config?.fastdepix_api_key || ""}
                    onChange={(e) => handleChange("fastdepix_api_key", e.target.value)}
                    className="input-default pr-12"
                    placeholder="Cole sua API Key aqui"
                    data-testid="api-key-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Webhook Secret</Label>
                <div className="relative">
                  <Input
                    type={showWebhookSecret ? "text" : "password"}
                    value={config?.fastdepix_webhook_secret || ""}
                    onChange={(e) => handleChange("fastdepix_webhook_secret", e.target.value)}
                    className="input-default pr-12"
                    placeholder="Cole o secret do webhook"
                    data-testid="webhook-secret-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showWebhookSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">URL do Webhook</p>
                <code className="text-xs text-green-400 mono break-all">
                  {process.env.REACT_APP_BACKEND_URL}/api/webhook/fastdepix
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Default Rates */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" />
                Taxas Padrão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Taxa Percentual (%)</Label>
                  <Input
                    type="number"
                    value={config?.taxa_percentual_padrao || ""}
                    onChange={(e) => handleChange("taxa_percentual_padrao", parseFloat(e.target.value))}
                    className="input-default"
                    step="0.1"
                    data-testid="taxa-percentual-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Taxa Fixa (R$)</Label>
                  <Input
                    type="number"
                    value={config?.taxa_fixa_padrao || ""}
                    onChange={(e) => handleChange("taxa_fixa_padrao", parseFloat(e.target.value))}
                    className="input-default"
                    step="0.01"
                    data-testid="taxa-fixa-input"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50">
                <p className="text-slate-300">
                  Taxa atual: <span className="text-green-400 font-semibold">
                    {config?.taxa_percentual_padrao || 2}% + R${(config?.taxa_fixa_padrao || 0.99).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Esta taxa será aplicada a novos usuários
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Referral Settings */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Sistema de Indicações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Valor Mínimo para Liberar Indicação (R$)</Label>
                <Input
                  type="number"
                  value={config?.valor_minimo_indicacao || ""}
                  onChange={(e) => handleChange("valor_minimo_indicacao", parseFloat(e.target.value))}
                  className="input-default"
                  data-testid="valor-minimo-input"
                />
                <p className="text-xs text-slate-500">
                  Usuários precisam movimentar este valor para liberar indicações
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Comissão por Indicação (%)</Label>
                <Input
                  type="number"
                  value={config?.comissao_indicacao || ""}
                  onChange={(e) => handleChange("comissao_indicacao", parseFloat(e.target.value))}
                  className="input-default"
                  step="0.1"
                  data-testid="comissao-input"
                />
                <p className="text-xs text-slate-500">
                  Percentual que o indicador ganha sobre transações do indicado
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white">Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Admin Padrão</span>
                  <span className="text-white mono">ADMIN001</span>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-800">
                  <span className="text-slate-400">Senha Admin</span>
                  <span className="text-white mono">admin123</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-slate-400">Versão</span>
                  <span className="text-white">1.0.0</span>
                </div>

                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mt-4">
                  <p className="text-sm text-yellow-400">
                    Importante: Altere a senha do admin após o primeiro acesso!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            data-testid="save-config-btn"
          >
            {saving ? (
              <div className="spinner w-5 h-5" />
            ) : (
              <>
                <Save className="mr-2 w-4 h-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
