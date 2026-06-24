import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const USERS = [
  { role: 'Admin', email: 'admin@facultad.edu', password: 'admin123' },
  { role: 'Admin', email: 'admin2@facultad.edu', password: 'admin123' },
  { role: 'Admin', email: 'admin3@facultad.edu', password: 'admin123' },
  { role: 'Docente', email: 'docente@facultad.edu', password: 'docente123' },
  { role: 'Docente', email: 'docente2@facultad.edu', password: 'docente123' },
  { role: 'Docente', email: 'docente3@facultad.edu', password: 'docente123' },
  { role: 'Alumno', email: 'alumno@uni.edu', password: 'alumno123' },
  { role: 'Alumno', email: 'alumno2@uni.edu', password: 'alumno123' },
  { role: 'Alumno', email: 'alumno3@uni.edu', password: 'alumno123' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const scanLines: { y: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 20; i++) {
      scanLines.push({
        y: Math.random() * canvas.height,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.02 + Math.random() * 0.03,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      scanLines.forEach((line) => {
        ctx.strokeStyle = `rgba(249, 115, 22, ${line.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, line.y);
        ctx.lineTo(canvas.width, line.y);
        ctx.stroke();

        line.y += line.speed;
        if (line.y > canvas.height) {
          line.y = 0;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Credenciales inválidas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (user: typeof USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl flex gap-8">
        <div className="flex-1">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-medium">
                MRI Simulator
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">ScRmhoot</h1>
            <p className="text-gray-500 text-sm mt-1">Sistema de Entrenamiento</p>
          </div>

          <div className="bg-[#111111] border border-[#1f1f1f] rounded-sm">
            <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-30" />

            <div className="p-4">
              <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-3">Seleccionar Usuario</p>
              <div className="space-y-1.5">
                {USERS.map((user, i) => (
                  <button
                    key={i}
                    onClick={() => handleUserClick(user)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-sm transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                        user.role === 'Admin' ? 'bg-red-500/20 text-red-400' :
                        user.role === 'Docente' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-gray-400 text-xs font-mono">{user.email}</span>
                    </div>
                    <span className="text-gray-600 text-[10px] font-mono group-hover:text-gray-500 transition-colors">
                      {user.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-30" />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
            <span className="text-[10px] text-gray-600">Sistema Activo</span>
          </div>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-sm">
            <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-30" />

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Identificación
                </label>
                <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                    placeholder="email@ejemplo.com"
                    required
                  />
                  {focusedField === 'email' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-orange-500/50" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                  Clave de Acceso
                </label>
                <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  {focusedField === 'password' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-orange-500/50" />
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-3 py-2">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#1a1a1a] hover:bg-[#222222] border border-[#2a2a2a] text-white text-sm font-medium rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <span className="text-gray-500">Procesando...</span>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-30" />
          </div>

          <div className="text-center mt-4">
            <span className="text-[10px] text-gray-600 font-mono">v2.4.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
