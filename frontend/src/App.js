import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Referrals from "./pages/Referrals";
import Commissions from "./pages/Commissions";
import Withdrawals from "./pages/Withdrawals";
import Transfers from "./pages/Transfers";
import Personalization from "./pages/Personalization";
import ApiIntegration from "./pages/ApiIntegration";
import Tickets from "./pages/Tickets";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminTeam from "./pages/admin/AdminTeam";
import PublicPage from "./pages/PublicPage";
import "@/App.css";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="spinner w-10 h-10"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="spinner w-10 h-10"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register/:codigo" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/p/:codigo" element={<PublicPage />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
      <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
      <Route path="/withdrawals" element={<ProtectedRoute><Withdrawals /></ProtectedRoute>} />
      <Route path="/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
      <Route path="/personalization" element={<ProtectedRoute><Personalization /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/api-integration" element={<ProtectedRoute><ApiIntegration /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
      
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute adminOnly><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/config" element={<ProtectedRoute adminOnly><AdminConfig /></ProtectedRoute>} />
      <Route path="/admin/tickets" element={<ProtectedRoute adminOnly><AdminTickets /></ProtectedRoute>} />
      <Route path="/admin/team" element={<ProtectedRoute adminOnly><AdminTeam /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registrado:', registration.scope);
      })
      .catch(error => {
        console.log('SW falhou:', error);
      });
  });
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <InstallPrompt />
      </AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f8fafc',
          },
        }}
      />
    </BrowserRouter>
  );
}

// Componente de prompt de instalação do PWA
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isAndroid, setIsAndroid] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    // Detectar plataforma
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    
    // Debug para verificar no dispositivo
    console.log('[PWA] User Agent:', ua);
    console.log('[PWA] iOS:', isIOSDevice, 'Android:', isAndroidDevice);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    
    // Verificar se já está em modo standalone (instalado)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    
    // Se já está instalado, não mostrar nada
    if (standalone) {
      setShowInstallBanner(false);
      return;
    }
    
    // Verificar se foi dispensado recentemente
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Não mostrar se dispensado há menos de 7 dias
      }
    }
    
    // Para iOS, mostrar instruções após 2 segundos
    if (isIOSDevice) {
      setTimeout(() => setShowInstallBanner(true), 2000);
      return;
    }
    
    // Para Android/Desktop, esperar o evento beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Mostrar banner para Android mesmo sem o evento (após 3 segundos)
    if (isAndroidDevice) {
      setTimeout(() => {
        if (!deferredPrompt) {
          setShowInstallBanner(true);
        }
      }, 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showInstallBanner || isStandalone) return null;

  // Instruções específicas para iOS
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-slate-900 border border-green-500/30 rounded-xl p-4 shadow-2xl z-50 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 font-bold text-2xl">$</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm">Instalar FastPix</h3>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Adicione à tela inicial para acesso rápido:
            </p>
            <div className="space-y-2 text-xs text-slate-300 bg-slate-800/50 p-3 rounded-lg">
              <p className="flex items-center gap-2">
                <span className="text-lg">1.</span> 
                Toque no botão <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 rounded text-white text-xs">↑</span> Compartilhar
              </p>
              <p className="flex items-center gap-2">
                <span className="text-lg">2.</span> 
                Role e toque em <strong>"Adicionar à Tela de Início"</strong>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-lg">3.</span> 
                Toque em <strong>"Adicionar"</strong>
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-3 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Instruções para Android (quando não tem o prompt automático)
  if (isAndroid && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-slate-900 border border-green-500/30 rounded-xl p-4 shadow-2xl z-50 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-green-400 font-bold text-2xl">$</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm">Instalar FastPix</h3>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Adicione à tela inicial para acesso rápido:
            </p>
            <div className="space-y-2 text-xs text-slate-300 bg-slate-800/50 p-3 rounded-lg">
              <p className="flex items-center gap-2">
                <span className="text-lg">1.</span> 
                Toque no menu <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-700 rounded text-white text-xs">⋮</span> do navegador
              </p>
              <p className="flex items-center gap-2">
                <span className="text-lg">2.</span> 
                Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-3 w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner padrão com botão de instalar (para quando tem o prompt)
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 border border-green-500/30 rounded-xl p-4 shadow-2xl z-50 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-green-400 font-bold text-2xl">$</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">Instalar FastPix</h3>
          <p className="text-xs text-slate-400 mt-1">
            Adicione à tela inicial para acesso rápido
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Instalar App
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
