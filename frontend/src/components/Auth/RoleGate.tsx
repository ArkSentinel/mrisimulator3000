import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'docente' | 'estudiante')[];
  requireAuth?: boolean;
}

export default function RoleGate({ children, allowedRoles, requireAuth = true }: RoleGateProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin text-4xl text-white">⟳</div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as 'admin' | 'docente' | 'estudiante')) {
    if (user.role === 'docente') {
      return <Navigate to="/teacher-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}