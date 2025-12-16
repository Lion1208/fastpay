import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { toast, Toaster } from "sonner";
import { QrCode, Copy, ArrowRight, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

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
    nome_pagador: "",
    cpf_pagador: ""
  });
  const [checking, setChecking] = useState(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchPageData();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [codigo]);

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (transaction && transaction.status === "pending" && transaction.fastdepix_id) {
      setChecking(true);
      
      pollingRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/transactions/${transaction.id}/status`);
          if (response.data.status === "paid") {
            setTransaction(prev => ({ ...prev, status: "paid" }));
            setChecking(false);
            clearInterval(pollingRef.current);
            toast.success("Pagamento confirmado!");
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 5000); // Polling a cada 5 segundos
      
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [transaction]);

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

  const formatCpf = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})/, "$1-$2")
        .replace(/(-\d{2})\d+?$/, "$1");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const valor = parseFloat(formData.valor);
    
    if (!valor || valor < 10) {
      toast.error("Valor mínimo é R$10,00");
      return;
    }

    if (!formData.nome_pagador.trim()) {
      toast.error("Informe seu nome");
      return;
    }

    if (!formData.cpf_pagador || formData.cpf_pagador.replace(/\D/g, "").length < 11) {
      toast.error("Informe um CPF/CNPJ válido");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/p/${codigo}/pay`, {
        valor: valor,
        nome_pagador: formData.nome_pagador,
        cpf_pagador: formData.cpf_pagador.replace(/\D/g, "")
      });
      setTransaction(response.data);
      toast.success("PIX gerado com sucesso!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar pagamento");
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">404</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link to="/login">
            <Button className="btn-primary">Voltar ao Início</Button>
          </Link>
        </div>
      </div>
    );
  }

  const corPrimaria = pageData?.pagina_personalizada?.cor_primaria || "#22c55e";
  const nomeSistema = pageData?.nome_sistema || "FastPay";

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <div className="relative py-16 px-4 overflow-hidden">
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
          {pageData?.logo_url ? (
            <img src={pageData.logo_url} alt={nomeSistema} className="h-16 mx-auto mb-6" />
          ) : (
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
          )}
          
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
                    <Label className="text-slate-300">Valor (R$) <span className="text-red-400">*</span></Label>
                    <Input
                      type="number"
                      placeholder="Mínimo R$10,00"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      className="input-default h-14 text-lg"
                      step="0.01"
                      min="10"
                      data-testid="public-valor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Seu Nome <span className="text-red-400">*</span></Label>
                    <Input
                      type="text"
                      placeholder="Nome completo"
                      value={formData.nome_pagador}
                      onChange={(e) => setFormData({ ...formData, nome_pagador: e.target.value })}
                      className="input-default"
                      data-testid="public-nome"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">CPF/CNPJ <span className="text-red-400">*</span></Label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formData.cpf_pagador}
                      onChange={(e) => setFormData({ ...formData, cpf_pagador: formatCpf(e.target.value) })}
                      className="input-default"
                      maxLength={18}
                      data-testid="public-cpf"
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
                    {transaction.qr_code ? (
                      <img 
                        src={transaction.qr_code} 
                        alt="QR Code PIX" 
                        className="w-48 h-48"
                      />
                    ) : (
                      <QrCode className="w-48 h-48 text-slate-800" />
                    )}
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(transaction.valor)}
                  </p>
                </div>

                <div className="space-y-4">
                  {transaction.pix_copia_cola ? (
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
                  ) : (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-sm text-yellow-400">
                        QR Code será gerado quando a API FastDePix estiver configurada
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 py-3">
                    {transaction.status === "paid" ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">Pagamento Confirmado!</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-400">Aguardando pagamento...</span>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setTransaction(null);
                      setFormData({ valor: "", nome_pagador: "", cpf_pagador: "" });
                    }}
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
              Pagamento seguro via PIX • {nomeSistema}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
