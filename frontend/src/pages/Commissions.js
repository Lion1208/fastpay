import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  Clock, 
  Bitcoin, 
  AlertCircle, 
  Edit, 
  Download,
  Loader2,
  Zap,
  CheckCircle
} from "lucide-react";

export default function Commissions() {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState({ comissao_indicacao: 1 });
  const [loading, setLoading] = useState(true);
  const [sideswapWallet, setSideswapWallet] = useState(null);
  const [showSideSwapDialog, setShowSideSwapDialog] = useState(false);
  const [walletInput, setWalletInput] = useState("");
  const [savingWallet, setSavingWallet] = useState(false);

  useEffect(() => {
    fetchCommissions();
    fetchConfig();
    fetchWallet();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await api.get(`/commissions`);
      setData(response.data);
    } catch (error) {
      toast.error("Erro ao carregar comissões");
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get('/config/public');
      setConfig(response.data);
    } catch (error) {
      console.error("Erro ao carregar config");
    }
  };

  const fetchWallet = async () => {
    try {
      const response = await api.get('/sideswap/wallet');
      setSideswapWallet(response.data.wallet_address);
    } catch (error) {
      console.error("Erro ao carregar carteira");
    }
  };

  const handleSaveWallet = async () => {
    if (!walletInput || walletInput.length < 20) {
      toast.error("Endereço de carteira inválido");
      return;
    }

    setSavingWallet(true);
    try {
      await api.post('/sideswap/wallet', { wallet_address: walletInput });
      setSideswapWallet(walletInput);
      setShowSideSwapDialog(false);
      setWalletInput("");
      toast.success("Carteira SideSwap vinculada!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao vincular carteira");
    } finally {
      setSavingWallet(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
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
      <div className="space-y-4 animate-fade-in" data-testid="commissions-page">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Comissões</h1>
          <p className="text-slate-400 text-sm">Ganhos com indicações</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="card-stat">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Saldo</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(data?.saldo_comissoes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-stat">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Total Ganho</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(data?.total_comissoes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saque Automático Card */}
        <Card className={`${sideswapWallet ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sideswapWallet ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                <Zap className={`w-4 h-4 ${sideswapWallet ? 'text-green-400' : 'text-orange-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-sm ${sideswapWallet ? 'text-green-400' : 'text-orange-400'}`}>
                  Saque Automático de Comissões
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {sideswapWallet ? (
                    <>
                      <CheckCircle className="w-3 h-3 inline mr-1 text-green-400" />
                      Ativado! Quando seu saldo de comissões atingir <strong className="text-green-400">R$30</strong>, 
                      o saque será feito automaticamente via Depix.
                    </>
                  ) : (
                    <>
                      Vincule sua carteira SideSwap para ativar o saque automático quando atingir R$30 em comissões.
                    </>
                  )}
                </p>
                
                {sideswapWallet ? (
                  <div className="mt-2 p-2 bg-slate-800/50 rounded overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-[10px] font-mono truncate flex-1" title={sideswapWallet}>
                        {sideswapWallet}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-green-400 flex-shrink-0"
                        onClick={() => {
                          setWalletInput(sideswapWallet);
                          setShowSideSwapDialog(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => setShowSideSwapDialog(true)}
                    className="mt-2 bg-orange-600 hover:bg-orange-700 h-7 text-xs"
                  >
                    <Bitcoin className="w-3 h-3 mr-1" />
                    Vincular SideSwap
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="card-dashboard">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-white text-sm">Como funciona?</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Você ganha <span className="text-green-400 font-medium">{config?.comissao_indicacao || 1}%</span> de todas as transações 
                  dos seus indicados. As comissões são creditadas automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions List */}
        <Card className="card-dashboard">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm text-white">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {data?.commissions?.length > 0 ? (
              <div className="space-y-2">
                {data.commissions.map((com) => (
                  <div key={com.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-400 font-bold">{formatCurrency(com.valor_comissao)}</p>
                        <p className="text-[10px] text-slate-500">
                          {com.percentual}% de {formatCurrency(com.valor_transacao)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={com.status === "credited" ? "badge-success text-[10px]" : "badge-warning text-[10px]"}>
                          {com.status === "credited" ? "Creditado" : "Pendente"}
                        </Badge>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {new Date(com.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <DollarSign className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-xs">Nenhuma comissão ainda</p>
                <p className="text-[10px] text-slate-600 mt-1">Indique amigos para começar a ganhar</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SideSwap Wallet Dialog */}
        <Dialog open={showSideSwapDialog} onOpenChange={setShowSideSwapDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-orange-400" />
                Vincular Carteira SideSwap
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Tutorial */}
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-orange-400 font-medium text-sm mb-2">Como obter sua carteira:</p>
                <ol className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                    <span>Instale o app <strong>SideSwap</strong> no seu dispositivo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                    <span>Abra o app e clique em <strong>"Receber"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                    <span>Gere uma <strong>carteira normal</strong> (L-BTC)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">4</span>
                    <span><strong>Copie o endereço</strong> e cole abaixo</span>
                  </li>
                </ol>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-orange-500/30 text-orange-400"
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=io.sideswap', '_blank')}
                  >
                    <Download className="w-3 h-3 mr-1" /> Android
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-orange-500/30 text-orange-400"
                    onClick={() => window.open('https://apps.apple.com/us/app/sideswap/id1556476417', '_blank')}
                  >
                    <Download className="w-3 h-3 mr-1" /> iOS
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Endereço da Carteira</Label>
                <Input
                  type="text"
                  placeholder="Cole o endereço aqui..."
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSideSwapDialog(false)}
                  className="flex-1 border-slate-700"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveWallet}
                  disabled={savingWallet || !walletInput}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {savingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
