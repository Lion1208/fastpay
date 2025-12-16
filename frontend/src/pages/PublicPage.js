import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { toast, Toaster } from "sonner";
import { QrCode, Copy, ArrowRight, CheckCircle, Clock, AlertCircle, Loader2, PartyPopper, UserX, User } from "lucide-react";
import { Switch } from "../components/ui/switch";


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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const ANONYMOUS_LIMIT = 500; // Limite para pagamento anônimo
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchPageData();
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [codigo]);

  // Polling para verificar status (apenas consulta o backend que já faz o trabalho)
  useEffect(() => {
    if (transaction && transaction.status === "pending") {
      pollingRef.current = setInterval(async () => {
        try {
          const response = await api.get(`/transactions/${transaction.id}/status`);
          if (response.data.status === "paid") {
            setTransaction(prev => ({ ...prev, status: "paid", paid_at: response.data.paid_at }));
            clearInterval(pollingRef.current);
            setShowSuccess(true);
            toast.success("Pagamento confirmado!");
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 3000); // Consulta a cada 3 segundos
      
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [transaction]);

  const fetchPageData = async () => {
    try {
      const response = await api.get(`/p/${codigo}`);
      if (response.data.pode_indicar === false) {
        setPageData({ ...response.data, bloqueado: true });
      } else {
        setPageData(response.data);
      }
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

    // Validação para pagamento anônimo
    if (isAnonymous) {
      if (valor > ANONYMOUS_LIMIT) {
        toast.error(`Pagamento anônimo tem limite de ${formatCurrency(ANONYMOUS_LIMIT)}`);
        return;
      }
    } else {
      // Se não for anônimo, exige CPF/CNPJ
      if (!formData.cpf_pagador || formData.cpf_pagador.replace(/\D/g, "").length < 11) {
        toast.error("Informe um CPF/CNPJ válido");
        return;
      }
    }

    if (!formData.nome_pagador.trim()) {
      toast.error("Informe seu nome");
      return;
    }

    setCreating(true);
    try {
      const response = await api.post(`/p/${codigo}/pay`, {
        valor: valor,
        nome_pagador: isAnonymous ? "Anônimo" : formData.nome_pagador,
        cpf_pagador: isAnonymous ? "00000000000" : formData.cpf_pagador.replace(/\D/g, ""),
        is_anonymous: isAnonymous
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

  const resetForm = () => {
    setTransaction(null);
    setShowSuccess(false);
    setFormData({ valor: "", nome_pagador: "", cpf_pagador: "" });
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

  // Animação de sucesso
  if (showSuccess && transaction?.status === "paid") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Toaster position="top-right" />
        <div className="text-center max-w-md animate-fade-in">
          {/* Animação de confete/sucesso */}
          <div className="relative">
            <div 
              className="w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center animate-bounce"
              style={{ backgroundColor: `${corPrimaria}20`, boxShadow: `0 0 60px ${corPrimaria}40` }}
            >
              <CheckCircle className="w-16 h-16" style={{ color: corPrimaria }} />
            </div>
            {/* Partículas decorativas */}
            <div className="absolute inset-0 pointer-events-none">
              <PartyPopper className="absolute top-0 left-1/4 w-8 h-8 text-yellow-400 animate-pulse" />
              <PartyPopper className="absolute top-0 right-1/4 w-8 h-8 text-pink-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Pagamento Confirmado!
          </h1>
          
          <p className="text-xl text-slate-300 mb-2">
            {formatCurrency(transaction.valor)}
          </p>
          
          <p className="text-slate-400 mb-8">
            Obrigado pelo seu pagamento. A transação foi processada com sucesso.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={resetForm}
              className="w-full h-12"
              style={{ backgroundColor: corPrimaria }}
            >
              Fazer Novo Pagamento
            </Button>
          </div>
          
          <p className="text-slate-500 text-sm mt-8">
            {nomeSistema}
          </p>
        </div>
      </div>
    );
  }

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
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/30 w-full justify-center">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">Pagamento Confirmado!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 w-full justify-center">
                        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                        <span className="text-yellow-400">Verificando pagamento...</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={resetForm}
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
