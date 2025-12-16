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
import Personalization from "./pages/Personalization";
import ApiIntegration from "./pages/ApiIntegration";
import Tickets from "./pages/Tickets";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminConfig from "./pages/admin/AdminConfig";
import AdminTickets from "./pages/admin/AdminTickets";
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
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/register/:codigo" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/p/:codigo" element={<PublicPage />} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
      <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
      <Route path="/withdrawals" element={<ProtectedRoute><Withdrawals /></ProtectedRoute>} />
      <Route path="/personalization" element={<ProtectedRoute><Personalization /></ProtectedRoute>} />
      <Route path="/api-integration" element={<ProtectedRoute><ApiIntegration /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
      
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/withdrawals" element={<ProtectedRoute adminOnly><AdminWithdrawals /></ProtectedRoute>} />
      <Route path="/admin/config" element={<ProtectedRoute adminOnly><AdminConfig /></ProtectedRoute>} />
      <Route path="/admin/tickets" element={<ProtectedRoute adminOnly><AdminTickets /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
