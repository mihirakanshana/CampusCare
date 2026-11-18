import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
} from './pages/AuthPages';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserRole } from './types/campuscare';

function FullScreenLoader() {
  return (
    <div className="min-h-screen uf-ambient-canvas flex flex-col items-center justify-center gap-3">
      <div className="glass-panel rounded-2xl px-6 py-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
        <p className="text-xs font-semibold text-[#064E3B]">
          Loading UniFix...
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  allowedRole,
  render,
}: {
  allowedRole: UserRole;
  render: (profile: NonNullable<ReturnType<typeof useAuth>['profile']>) => React.ReactNode;
}) {
  const { loading, authReady, profile } = useAuth();

  if (!authReady || loading) {
    return <FullScreenLoader />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== allowedRole) {
    return (
      <Navigate
        to={profile.role === 'admin' ? '/admin' : '/student'}
        replace
      />
    );
  }

  return <>{render(profile)}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute
            allowedRole="student"
            render={(profile) => <StudentDashboard profile={profile} />}
          />
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute
            allowedRole="admin"
            render={(profile) => <AdminDashboard profile={profile} />}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
