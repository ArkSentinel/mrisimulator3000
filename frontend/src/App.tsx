import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import { WelcomeScreen } from './components/Welcome/WelcomeScreen';
import { SchedulerScreen } from './components/Scheduler/SchedulerScreen';
import { AdminScreen } from './components/Admin/AdminScreen';
import { ConsoleScreen } from './components/Console/ConsoleScreen';
import { VerificationScreen } from './components/Student/VerificationScreen';
import { PanelScreen } from './components/Student/PanelScreen';
import { TeacherDashboard } from './components/Teacher/TeacherDashboard';
import LoginScreen from './components/Auth/LoginScreen';
import Dashboard from './components/Auth/Dashboard';
import RoleGate from './components/Auth/RoleGate';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin text-4xl text-white">⟳</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginScreen />
      } />

      <Route path="/" element={<WelcomeScreen />} />

      {/* Protected routes - All authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/scheduler" element={
        <ProtectedRoute>
          <SchedulerScreen />
        </ProtectedRoute>
      } />

      <Route path="/console" element={
        <ProtectedRoute>
          <ConsoleScreen />
        </ProtectedRoute>
      } />

      {/* Student only routes */}
      <Route path="/verification" element={
        <ProtectedRoute>
          <RoleGate allowedRoles={['estudiante']}>
            <VerificationScreen />
          </RoleGate>
        </ProtectedRoute>
      } />

      <Route path="/panel" element={
        <ProtectedRoute>
          <RoleGate allowedRoles={['estudiante']}>
            <PanelScreen />
          </RoleGate>
        </ProtectedRoute>
      } />

      {/* Docente only routes */}
      <Route path="/teacher-dashboard" element={
        <ProtectedRoute>
          <RoleGate allowedRoles={['docente']}>
            <TeacherDashboard />
          </RoleGate>
        </ProtectedRoute>
      } />

      {/* Admin only routes */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <RoleGate allowedRoles={['admin']}>
            <AdminScreen />
          </RoleGate>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExamProvider>
          <AppRoutes />
        </ExamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
