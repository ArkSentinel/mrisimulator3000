import { useAuth } from '../../context/AuthContext';
import { Trophy, Zap, Target, Flame, ChevronRight, Star, Shield, Users, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const roleConfig = {
  admin: {
    label: 'Administrador',
    color: 'from-red-600 to-red-800',
    icon: Shield,
    description: 'Acceso total al sistema',
  },
  docente: {
    label: 'Docente',
    color: 'from-blue-600 to-blue-800',
    icon: Users,
    description: 'Puede crear exámenes y ver resultados',
  },
  estudiante: {
    label: 'Estudiante',
    color: 'from-green-600 to-green-800',
    icon: GraduationCap,
    description: 'Puede realizar exámenes',
  },
};

export default function Dashboard() {
  const { user, xp, achievements, logout } = useAuth();
  const navigate = useNavigate();

  const xpForNextLevel = xp ? (xp.nivel * 500) : 500;
  const xpProgress = xp ? (xp.xp_total % 500) : 0;
  const progressPercent = xp ? (xpProgress / xpForNextLevel) * 100 : 0;

  const currentRole = user?.role ? roleConfig[user.role as keyof typeof roleConfig] : roleConfig.estudiante;
  const RoleIcon = currentRole.icon;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Bienvenido, {user?.nombre}</h1>
              <p className="text-gray-500">Simulador de Consola MRI</p>
            </div>
            <div className={`px-3 py-1 rounded-full bg-[#1f1f1f] border border-slate-700 text-gray-300 text-xs font-medium flex items-center gap-1`}>
              <RoleIcon className="w-3 h-3" />
              {currentRole.label}
            </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-slate-700 text-gray-300 rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1a1a1a] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-gray-400" />
              <span className="text-gray-400">Nivel Actual</span>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{xp?.nivel || 1}</p>
            <p className="text-gray-500 text-sm">{currentRole.description}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-gray-400" />
              <span className="text-gray-400">XP Total</span>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{xp?.xp_total || 0}</p>
            <div className="mt-2 h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-gray-500 text-sm mt-1">{xpProgress} / {xpForNextLevel} XP para siguiente nivel</p>
          </div>

          <div className="bg-[#1a1a1a] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Flame className="w-6 h-6 text-gray-400" />
              <span className="text-gray-400">Racha</span>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{xp?.racha_dias || 0}</p>
            <p className="text-gray-500 text-sm">días consecutivos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1a1a1a] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-400" />
                Estadísticas
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg">
                <span className="text-gray-400">Exámenes completados</span>
                <span className="text-white font-bold">{xp?.examenes_totales || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg">
                <span className="text-gray-400">Último examen</span>
                <span className="text-white font-bold">
                  {xp?.ultimo_examen ? new Date(xp.ultimo_examen).toLocaleDateString() : 'Nunca'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gray-400" />
                Logros Obtenidos
              </h2>
            </div>
            {achievements.length > 0 ? (
              <div className="space-y-3">
                {achievements.map((achievement) => (
                  <div key={achievement.codigo} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                    <div className="w-10 h-10 bg-[#1f1f1f] rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{achievement.nombre}</p>
                      <p className="text-gray-500 text-sm">{achievement.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Completa exámenes para ganar logros</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/scheduler')}
              className="p-4 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-slate-700 rounded-xl text-left transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Nuevo Examen</p>
                  <p className="text-gray-500 text-sm">Iniciar simulación</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>
            </button>

            <button className="p-4 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-slate-700 rounded-xl text-left transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Mis Exámenes</p>
                  <p className="text-gray-500 text-sm">Ver historial</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>
            </button>

            <button className="p-4 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-slate-700 rounded-xl text-left transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Pre-Test</p>
                  <p className="text-gray-500 text-sm">Evaluar conocimientos</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="p-4 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-slate-700 rounded-xl text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Panel Admin</p>
                    <p className="text-gray-500 text-sm">Gestionar usuarios y sistema</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
