import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Palette, Save, ExternalLink, Eye } from "lucide-react";


export default function Personalization() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    pagina_personalizada: {
      titulo: "",
      cor_primaria: "#22c55e",
      descricao: ""
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || "",
        email: user.email || "",
        whatsapp: user.whatsapp || "",
        pagina_personalizada: user.pagina_personalizada || {
          titulo: user.nome || "",
          cor_primaria: "#22c55e",
          descricao: ""
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.put(`${API}/auth/me`, formData);
      updateUser(response.data);
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      pagina_personalizada: {
        ...prev.pagina_personalizada,
        [key]: value
      }
    }));
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="personalization-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Personalização</h1>
          <p className="text-slate-400">Configure sua conta e página pública</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Settings */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white">Dados da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome</Label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input-default"
                  data-testid="input-nome"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-default"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">WhatsApp</Label>
                <Input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="input-default"
                  placeholder="(00) 00000-0000"
                  data-testid="input-whatsapp"
                />
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-400">Seu Código de Acesso</p>
                <p className="text-xl font-bold mono text-green-400">{user?.codigo}</p>
              </div>
            </CardContent>
          </Card>

          {/* Page Customization */}
          <Card className="card-dashboard">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-green-400" />
                Página Personalizada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Título da Página</Label>
                <Input
                  type="text"
                  value={formData.pagina_personalizada.titulo}
                  onChange={(e) => handlePageChange("titulo", e.target.value)}
                  className="input-default"
                  placeholder="Minha Página de Pagamentos"
                  data-testid="input-titulo"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Descrição</Label>
                <Input
                  type="text"
                  value={formData.pagina_personalizada.descricao}
                  onChange={(e) => handlePageChange("descricao", e.target.value)}
                  className="input-default"
                  placeholder="Receba pagamentos de forma rápida e segura"
                  data-testid="input-descricao"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Cor Principal</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.pagina_personalizada.cor_primaria}
                    onChange={(e) => handlePageChange("cor_primaria", e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-0"
                    data-testid="input-cor"
                  />
                  <Input
                    type="text"
                    value={formData.pagina_personalizada.cor_primaria}
                    onChange={(e) => handlePageChange("cor_primaria", e.target.value)}
                    className="input-default flex-1 mono"
                  />
                </div>
              </div>

              <div className="pt-4">
                <a
                  href={`${window.location.origin}/p/${user?.codigo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full p-3 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Página Pública
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card className="card-dashboard">
          <CardHeader>
            <CardTitle className="text-lg text-white">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="p-8 rounded-xl border border-slate-700"
              style={{ backgroundColor: "#0f172a" }}
            >
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: `${formData.pagina_personalizada.cor_primaria}20` }}
                >
                  <span 
                    className="text-3xl font-bold"
                    style={{ color: formData.pagina_personalizada.cor_primaria }}
                  >
                    $
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {formData.pagina_personalizada.titulo || formData.nome || "Sua Página"}
                </h2>
                <p className="text-slate-400 mt-2">
                  {formData.pagina_personalizada.descricao || "Pague de forma rápida e segura via PIX"}
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    className="px-6 py-3 rounded-lg font-semibold text-white transition-colors"
                    style={{ 
                      backgroundColor: formData.pagina_personalizada.cor_primaria,
                      boxShadow: `0 0 20px ${formData.pagina_personalizada.cor_primaria}40`
                    }}
                  >
                    Pagar com PIX
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary"
            data-testid="save-btn"
          >
            {loading ? (
              <div className="spinner w-5 h-5" />
            ) : (
              <>
                <Save className="mr-2 w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
