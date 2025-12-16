import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { toast, Toaster } from "sonner";
import { QrCode, Copy, ArrowRight, CheckCircle, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicPage() {
  const { codigo } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [formData, setFormData] = useState({
    valor: "",
    cpf_cnpj: "",
    descricao: ""
  });

  useEffect(() => {
    fetchPageData();
  }, [codigo]);

  const fetchPageData = async () => {
    try {
      const response = await axios.get(`${API}/p/${codigo}`);
      setPageData(response.data);
    } catch (error) {
      setError("Página não encontrada");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setCreating(true);
    try {
      // Note: This would need authentication in a real scenario
      // For demo, we show a mock response
      toast.info("Demo: Em produção, esta transação seria criada via API");
      setTransaction({
        valor: parseFloat(formData.valor),
        status: "pending",
        pix_copia_cola: "00020126580014br.gov.bcb.pix0136demo-key-here520400005303986540510.005802BR5913Demo6008Sao Paulo62070503***6304DEMO"
      });
    } catch (error) {
      toast.error("Erro ao criar pagamento");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="spinner w-10 h-10"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">404</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link to="/">
            <Button className="btn-primary">Voltar ao Início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const corPrimaria = pageData?.pagina_personalizada?.cor_primaria || "#22c55e";

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <div className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${corPrimaria}30` }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: `${corPrimaria}20` }}
          />
        </div>

        <div className="relative max-w-lg mx-auto text-center">
          <div 
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${corPrimaria}20` }}
          >
            <span 
              className="text-4xl font-bold"
              style={{ color: corPrimaria }}
            >
              $
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {pageData?.pagina_personalizada?.titulo || pageData?.nome}
          </h1>
          
          <p className="text-lg text-slate-400">
            {pageData?.pagina_personalizada?.descricao || "Pague de forma rápida e segura via PIX"}
          </p>
        </div>
      </div>

      {/* Payment Form/Result */}
      <div className="px-4 pb-20">
        <div className="max-w-md mx-auto">
          {!transaction ? (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Valor (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      className="input-default h-14 text-lg"
                      step="0.01"
                      min="0"
                      data-testid="public-valor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">CPF/CNPJ (opcional)</Label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      className="input-default"
                      data-testid="public-cpf"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Descrição (opcional)</Label>
                    <Input
                      type="text"
                      placeholder="Ex: Pagamento de serviço"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      className="input-default"
                      data-testid="public-descricao"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={creating}
                    className="w-full h-14 text-lg font-semibold transition-all"
                    style={{ 
                      backgroundColor: corPrimaria,
                      boxShadow: `0 0 30px ${corPrimaria}40`
                    }}
                    data-testid="public-submit"
                  >
                    {creating ? (
                      <div className="spinner w-6 h-6" />
                    ) : (
                      <>
                        Gerar PIX
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardContent className="p-6 text-center">
                <div className="mb-6">
                  <div className="inline-block p-4 bg-white rounded-xl mb-4">
                    <QrCode className="w-40 h-40 text-slate-800" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(transaction.valor)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-400 text-sm">PIX Copia e Cola</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={transaction.pix_copia_cola}
                        readOnly
                        className="input-default mono text-xs"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(transaction.pix_copia_cola)}
                        className="border-slate-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 py-3">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400">Aguardando pagamento...</span>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setTransaction(null)}
                    className="w-full border-slate-700 text-slate-300"
                  >
                    Novo Pagamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              Pagamento seguro via PIX
            </p>
            <Link 
              to="/login"
              className="text-sm hover:underline mt-2 inline-block"
              style={{ color: corPrimaria }}
            >
              Crie sua própria página de pagamentos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
