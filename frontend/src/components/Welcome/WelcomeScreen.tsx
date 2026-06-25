import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}

function IconButton({ icon, label, onClick, disabled, active }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center w-48 h-48 rounded-xl transition-all ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : active
          ? 'bg-orange-600 hover:bg-orange-700 cursor-pointer active:scale-95'
          : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] cursor-pointer active:scale-95'
      }`}
    >
      <div className={`mb-3 ${active ? 'text-white' : 'text-gray-300'}`}>{icon}</div>
      <span className={`text-sm ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

const VerificationIcon = () => (
  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    <path d="M8 12l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PanelIcon = () => (
  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" strokeWidth="1.5" rx="1" />
    <rect x="14" y="3" width="7" height="7" strokeWidth="1.5" rx="1" />
    <rect x="3" y="14" width="7" height="7" strokeWidth="1.5" rx="1" />
    <rect x="14" y="14" width="7" height="7" strokeWidth="1.5" rx="1" />
  </svg>
);

const ExamIcon = () => (
  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
    <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeWidth="1.5" />
  </svg>
);

const BloqueoIcon = () => (
  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="1.5" />
    <path d="M12 11V7a2 2 0 012-2h2a2 2 0 012 2v4" strokeWidth="1.5" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isStudent = user?.role === 'estudiante';
  const isDocente = user?.role === 'docente';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex flex-col h-screen bg-[#2a2a2a]">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-8">
          <IconButton
            icon={<VerificationIcon />}
            label="Verificación"
            onClick={() => navigate('/verification')}
            disabled={!isStudent && !isAdmin}
          />
          <IconButton
            icon={<PanelIcon />}
            label="Panel"
            onClick={() => navigate('/panel')}
            disabled={!isStudent && !isAdmin}
          />
          <IconButton
            icon={<ExamIcon />}
            label="Examen"
            onClick={() => navigate('/scheduler')}
          />
          <IconButton
            icon={<BloqueoIcon />}
            label="Bloqueo"
            disabled={!isStudent && !isAdmin}
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-8 bg-black flex items-center justify-between px-4">
        {isAdmin ? (
          <Link to="/admin" className="text-xs text-red-400 hover:text-red-300">
            Admin
          </Link>
        ) : isDocente ? (
          <Link to="/teacher-dashboard" className="text-xs text-purple-400 hover:text-purple-300">
            Panel Docente
          </Link>
        ) : isStudent ? (
          <Link to="/student-home" className="text-xs text-orange-400 hover:text-orange-300">
            Mi Progreso
          </Link>
        ) : null}
        {isAuthenticated ? (
          <Link to="/dashboard" className="text-xs text-blue-400 hover:text-blue-300">
            {user?.nombre} (Dashboard)
          </Link>
        ) : (
          <Link to="/login" className="text-xs text-green-400 hover:text-green-300">
            Iniciar Sesión
          </Link>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
          <span className="text-xs text-gray-400 font-mono">{formatTime(time)}</span>
          <button className="flex items-center gap-1 text-gray-400 hover:text-gray-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
