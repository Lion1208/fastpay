import { useState, useEffect, useRef } from "react";
import { Layout } from "../../components/Layout";
import api from "../../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Settings, Key, Save, Eye, EyeOff, DollarSign, Palette, Image, Upload, Trash2, Loader2 } from "lucide-react";


export default function AdminConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    codigo: "",
    senha_atual: "",
    senha_nova: ""
  });
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/admin/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      handleChange("logo_url", response.data.url);
      toast.success("Logo enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    handleChange("logo_url", "");
    toast.success("Logo removido");
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get(`/admin/config`);
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
      const response = await api.put(`/admin/config`, config);
      setConfig(response.data);
      toast.success("Configurações salvas! Recarregue a página para ver as alterações.");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdateAdminCredentials = async () => {
    if (!adminCredentials.senha_atual) {
      toast.error("Digite sua senha atual");
      return;
    }
    
    if (!adminCredentials.codigo && !adminCredentials.senha_nova) {
      toast.error("Preencha o novo código ou a nova senha");
      return;
    }
    
    setSavingCredentials(true);
    try {
      await api.put(`/admin/credentials`, {
        codigo: adminCredentials.codigo || null,
        senha_atual: adminCredentials.senha_atual,
        senha_nova: adminCredentials.senha_nova || null
      });
      
      toast.success("Credenciais atualizadas! Faça login novamente.");
      setAdminCredentials({ codigo: "", senha_atual: "", senha_nova: "" });
      
      // Logout após alteração
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar credenciais");
    } finally {
      setSavingCredentials(false);
    }
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
          {/* Branding */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-400" />
                Identidade do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Sistema</Label>
                <Input
                  type="text"
                  value={config?.nome_sistema || ""}
                  onChange={(e) => handleChange("nome_sistema", e.target.value)}
                  className="input-default"
                  placeholder="Ex: BravePix, PixPro, etc"
                  data-testid="nome-sistema-input"
                />
                <p className="text-xs text-slate-500">
                  Este nome aparecerá em todo o painel, login e páginas públicas
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Logo do Sistema</Label>
                
                {/* Upload de arquivo */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex-1 border-slate-700 hover:bg-slate-800"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploadingLogo ? "Enviando..." : "Fazer Upload"}
                  </Button>
                  {config?.logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveLogo}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Ou URL externa */}
                <div className="relative">
                  <Input
                    type="url"
                    value={config?.logo_url || ""}
                    onChange={(e) => handleChange("logo_url", e.target.value)}
                    className="input-default"
                    placeholder="Ou cole uma URL: https://exemplo.com/logo.png"
                    data-testid="logo-url-input"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Faça upload de uma imagem ou cole uma URL. Deixe vazio para usar o ícone padrão.
                </p>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-xs text-slate-500 mb-3">Pré-visualização</p>
                <div className="flex items-center gap-3">
                  {config?.logo_url ? (
                    <img src={config.logo_url} alt="Logo" className="h-10" onError={(e) => e.target.style.display='none'} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 font-bold text-xl">$</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white">{config?.nome_sistema || "BravePix"}</h3>
                    <p className="text-xs text-slate-500">Sistema PIX</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    placeholder="fdpx_xxxxxxxxxxxxxxxx"
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
                <p className="text-xs text-slate-500">
                  Sua chave da FastDePix para gerar QR codes PIX reais
                </p>
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
                <DollarSign className="w-5 h-5 text-cyan-400" />
                Taxas Padrão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Taxa Transação (%)</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Taxa Saque (%)</Label>
                  <Input
                    type="number"
                    value={config?.taxa_saque_padrao || ""}
                    onChange={(e) => handleChange("taxa_saque_padrao", parseFloat(e.target.value))}
                    className="input-default"
                    step="0.1"
                    placeholder="1.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Taxa Transferência (%)</Label>
                  <Input
                    type="number"
                    value={config?.taxa_transferencia_padrao || ""}
                    onChange={(e) => handleChange("taxa_transferencia_padrao", parseFloat(e.target.value))}
                    className="input-default"
                    step="0.1"
                    placeholder="0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Valor Mín. Saque (R$)</Label>
                  <Input
                    type="number"
                    value={config?.valor_minimo_saque || ""}
                    onChange={(e) => handleChange("valor_minimo_saque", parseFloat(e.target.value))}
                    className="input-default"
                    step="1"
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Valor Mín. Transferência (R$)</Label>
                  <Input
                    type="number"
                    value={config?.valor_minimo_transferencia || ""}
                    onChange={(e) => handleChange("valor_minimo_transferencia", parseFloat(e.target.value))}
                    className="input-default"
                    step="0.01"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 space-y-1">
                <p className="text-slate-300 text-sm">
                  Transação: <span className="text-green-400 font-semibold">
                    {config?.taxa_percentual_padrao || 2}% + R${(config?.taxa_fixa_padrao || 0.99).toFixed(2)}
                  </span>
                </p>
                <p className="text-slate-300 text-sm">
                  Saque: <span className="text-cyan-400 font-semibold">
                    {config?.taxa_saque_padrao || 1.5}%
                  </span>
                </p>
                <p className="text-slate-300 text-sm">
                  Transferência: <span className="text-purple-400 font-semibold">
                    {config?.taxa_transferencia_padrao || 0.5}%
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Taxas aplicadas a novos usuários
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Referral Settings */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-400" />
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
        </div>

        {/* Admin Credentials Card */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-red-400" />
              Suas Credenciais de Acesso
            </CardTitle>
            <p className="text-sm text-slate-500">
              Altere seu código e senha pessoal. Não afeta outros administradores.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Seu Novo Código de Acesso</Label>
                <Input
                  type="text"
                  placeholder="Ex: ADMIN2024"
                  value={adminCredentials.codigo}
                  onChange={(e) => setAdminCredentials({ ...adminCredentials, codigo: e.target.value.toUpperCase() })}
                  className="input-default"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Sua Nova Senha</Label>
                <Input
                  type="password"
                  placeholder="Nova senha (deixe vazio para manter)"
                  value={adminCredentials.senha_nova}
                  onChange={(e) => setAdminCredentials({ ...adminCredentials, senha_nova: e.target.value })}
                  className="input-default"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Sua Senha Atual (obrigatório)</Label>
              <Input
                type="password"
                placeholder="Digite sua senha atual para confirmar"
                value={adminCredentials.senha_atual}
                onChange={(e) => setAdminCredentials({ ...adminCredentials, senha_atual: e.target.value })}
                className="input-default"
              />
            </div>
            
            <Button 
              onClick={handleUpdateAdminCredentials}
              disabled={savingCredentials || !adminCredentials.senha_atual}
              className="btn-primary"
            >
              {savingCredentials ? "Salvando..." : "Atualizar Credenciais"}
            </Button>
            
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-400">
                Após alterar as credenciais, você precisará fazer login novamente.
              </p>
            </div>
          </CardContent>
        </Card>

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
