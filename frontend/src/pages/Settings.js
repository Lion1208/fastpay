import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import api from "../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { 
  Shield, 
  Smartphone,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  QrCode,
  Bell,
  BellOff
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { isPushSupported, isSubscribedToPush, subscribeToPush, unsubscribeFromPush, getNotificationPermission } from "../utils/push";


export default function Settings() {
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 2FA Setup
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  
  // 2FA Disable
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  
  // Password Change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Push Notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  useEffect(() => {
    fetch2FAStatus();
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    setPushSupported(isPushSupported());
    setPushPermission(getNotificationPermission());
    if (isPushSupported()) {
      const subscribed = await isSubscribedToPush();
      setPushEnabled(subscribed);
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const response = await api.get(`/auth/2fa/status`);
      setTwoFactorEnabled(response.data.enabled);
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const response = await api.post(`/auth/2fa/setup`);
      setSetupData(response.data);
      setShowSetupDialog(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao configurar 2FA");
    }
  };

  const handleVerify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }
    
    setVerifying(true);
    try {
      await api.post(`/auth/2fa/verify`, { code: verifyCode });
      setTwoFactorEnabled(true);
      setShowSetupDialog(false);
      setSetupData(null);
      setVerifyCode("");
      toast.success("2FA ativado com sucesso!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Código inválido");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }
    
    setDisabling(true);
    try {
      await api.post(`/auth/2fa/disable`, { code: disableCode });
      setTwoFactorEnabled(false);
      setShowDisableDialog(false);
      setDisableCode("");
      toast.success("2FA desativado!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Código inválido");
    } finally {
      setDisabling(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    if (passwords.new.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }
    
    setChangingPassword(true);
    try {
      await api.put(`/auth/password?current_password=${encodeURIComponent(passwords.current)}&new_password=${encodeURIComponent(passwords.new)}`);
      setShowPasswordDialog(false);
      setPasswords({ current: "", new: "", confirm: "" });
      toast.success("Senha alterada com sucesso!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast.success("Notificações desativadas");
      } else {
        await subscribeToPush();
        setPushEnabled(true);
        setPushPermission('granted');
        toast.success("Notificações ativadas! Você receberá alertas mesmo com o navegador fechado.");
      }
    } catch (error) {
      console.error("Push error:", error);
      if (error.message?.includes('negada')) {
        toast.error("Permissão de notificação negada. Habilite nas configurações do navegador.");
        setPushPermission('denied');
      } else {
        toast.error(error.message || "Erro ao configurar notificações");
      }
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-slate-400">Gerencie a segurança da sua conta</p>
        </div>

        {/* 2FA Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-white">Autenticação de Dois Fatores (2FA)</CardTitle>
                <CardDescription className="text-slate-400">
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white">Autenticador</p>
                    <p className="text-sm text-slate-500">
                      {twoFactorEnabled ? "Ativado" : "Use um app como Google Authenticator"}
                    </p>
                  </div>
                </div>
                
                {twoFactorEnabled ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Ativado
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDisableDialog(true)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      Desativar
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleSetup2FA}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Ativar 2FA
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Bell className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-white">Notificações Push</CardTitle>
                <CardDescription className="text-slate-400">
                  Receba alertas mesmo com o navegador fechado
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!pushSupported ? (
              <div className="flex items-center gap-2 text-slate-500">
                <BellOff className="w-5 h-5" />
                <span>Seu navegador não suporta notificações push</span>
              </div>
            ) : pushPermission === 'denied' ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Permissão bloqueada. Habilite nas configurações do navegador.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white">Alertas de transferências</p>
                    <p className="text-sm text-slate-500">
                      {pushEnabled ? "Ativado - você receberá notificações" : "Receba avisos ao receber dinheiro"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {pushEnabled && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Ativo
                    </span>
                  )}
                  <Button
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                    variant={pushEnabled ? "outline" : "default"}
                    className={pushEnabled ? "border-slate-700" : "bg-purple-600 hover:bg-purple-700"}
                  >
                    {pushLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : pushEnabled ? (
                      "Desativar"
                    ) : (
                      "Ativar"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Senha</CardTitle>
                <CardDescription className="text-slate-400">
                  Altere sua senha de acesso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(true)}
              className="border-slate-700"
            >
              Alterar Senha
            </Button>
          </CardContent>
        </Card>

        {/* Dialog Setup 2FA */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Configurar 2FA</DialogTitle>
            </DialogHeader>
            
            {setupData && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-4">
                    Escaneie o QR Code com seu aplicativo autenticador
                  </p>
                  
                  <div className="inline-block p-4 bg-white rounded-xl mb-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qr_code_uri)}`}
                      alt="QR Code 2FA"
                      className="w-48 h-48"
                    />
                  </div>
                  
                  <p className="text-slate-500 text-xs mb-2">Ou insira manualmente:</p>
                  <div className="flex items-center gap-2 justify-center">
                    <code className="px-3 py-2 bg-slate-800 rounded text-green-400 text-sm font-mono">
                      {setupData.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(setupData.secret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Código de verificação</Label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-slate-800 border-slate-700 text-white text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>
                
                <Button
                  onClick={handleVerify2FA}
                  disabled={verifying || verifyCode.length !== 6}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar e Ativar"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog Disable 2FA */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Desativar 2FA</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Sua conta ficará menos segura
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Código do autenticador</Label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-slate-800 border-slate-700 text-white text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDisableDialog(false)}
                  className="border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDisable2FA}
                  disabled={disabling || disableCode.length !== 6}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {disabling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Desativar"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Change Password */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Alterar Senha</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Senha atual</Label>
                <Input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Nova senha</Label>
                <Input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Confirmar nova senha</Label>
                <Input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(false)}
                  className="border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {changingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : "Alterar Senha"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
