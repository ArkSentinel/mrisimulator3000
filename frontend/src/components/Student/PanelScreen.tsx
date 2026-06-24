import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSessionSocket, type Phase, type StudentRank, type LeaderboardPayload } from '../../hooks/useSessionSocket';

interface Player {
  user_id: number;
  nombre: string;
  ready: boolean;
}

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
    <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeWidth="1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    <path d="M8 12l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M8 21h8M12 17v4M7 4h10M7 4v4a5 5 0 0010 0V4M7 4H4v3a3 3 0 003 3M17 4h3v3a3 3 0 01-3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    <path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface HistoricalCase {
  case_name: string;
  date: string;
  accuracy: number;
}

const HISTORICAL_CASES: HistoricalCase[] = [
  { case_name: 'Rodilla - Lesión Meniscal', date: '15/05/2024', accuracy: 87 },
  { case_name: 'Cerebro - Tumor Hipofisario', date: '02/04/2024', accuracy: 92 },
  { case_name: 'Columna - Hernia Discal L4-L5', date: '18/03/2024', accuracy: 78 },
];

export function PanelScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentRank[]>([]);

  const handleLeaderboard = useCallback((data: LeaderboardPayload) => {
    setLeaderboard(data.rankings);
    setPlayers(data.rankings.map(r => ({
      user_id: r.user_id,
      nombre: r.nombre,
      ready: r.submitted,
    })));
  }, []);

  const handlePhaseChange = useCallback((phase: Phase) => {
    if (phase === 'SIMULATION' || phase === 'ACQUISITION') {
      navigate('/scheduler');
    }
  }, [navigate]);

  const handleStudentJoin = useCallback((userId: number, nombre: string) => {
    setPlayers(prev => {
      if (prev.find(p => p.user_id === userId)) return prev;
      return [...prev, { user_id: userId, nombre, ready: false }];
    });
  }, []);

  const handleStudentLeave = useCallback((userId: number) => {
    setPlayers(prev => prev.filter(p => p.user_id !== userId));
  }, []);

  const handleStudentReady = useCallback((userId: number, ready: boolean) => {
    setPlayers(prev => prev.map(p => p.user_id === userId ? { ...p, ready } : p));
  }, []);

  const handleError = useCallback((code: string) => {
    if (code === 'SESSION_NOT_FOUND') {
      setConnectionStatus('error');
    }
  }, []);

  const { connected, connect, disconnect } = useSessionSocket({
    sessionId: pin,
    userId: user?.id || 0,
    role: 'student',
    onLeaderboard: handleLeaderboard,
    onPhaseChange: handlePhaseChange,
    onStudentJoin: handleStudentJoin,
    onStudentLeave: handleStudentLeave,
    onStudentReady: handleStudentReady,
    onError: handleError,
  });

  const handleConnect = () => {
    if (pin.length !== 8) return;
    setConnectionStatus('connecting');
    connect(pin);
  };

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/');
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 8);
    setPin(value);
    if (connectionStatus === 'error') {
      setConnectionStatus('idle');
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Conectando...';
      case 'connected':
        return 'Conectado';
      case 'error':
        return 'Error: Sala no encontrada';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'text-orange-400';
      case 'connected':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const top10 = leaderboard.slice(0, 10);

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <header className="h-14 bg-[#1a1a1a] border-b border-[#3a3a3a] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-orange-400">Panel Estudiante</h1>
            <p className="text-[10px] text-gray-500">MCP-MRISimulator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
            <span className="text-xs text-gray-400">
              {!connected ? 'Esperando sala...' : 'Sesión activa - Esperando inicio...'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#3a3a3a] rounded transition-colors"
          >
            <LogoutIcon />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-[#1a1a1a] border-r border-[#3a3a3a] p-4 flex flex-col gap-4 shrink-0">
          <section className="bg-[#2a2a2a] rounded-lg p-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Unirse a Sesión</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">Código PIN</label>
                <input
                  type="text"
                  value={pin}
                  onChange={handlePinChange}
                  maxLength={8}
                  placeholder="XXXXXXXX"
                  className="w-full h-14 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-4 text-2xl font-mono font-bold text-center tracking-widest placeholder:text-gray-600 focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={pin.length !== 8 || connectionStatus === 'connecting'}
                className="w-full h-11 bg-[#f97316] hover:bg-[#ea580c] disabled:bg-[#5a5a5a] disabled:cursor-not-allowed text-white text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2"
              >
                Unirse a la Sala
              </button>
              {connectionStatus !== 'idle' && (
                <div className={`text-xs text-center ${getStatusColor()}`}>
                  {getStatusMessage()}
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <section className="bg-[#2a2a2a] rounded-lg p-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xs font-bold text-gray-400 uppercase">Jugadores Conectados ({players.length})</h2>
            </div>
            {players.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <UserIcon />
                <p className="mt-2 text-sm">Esperando jugadores...</p>
                <p className="text-xs mt-1">Ingresa el PIN para unirte</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {players.slice(0, 15).map(player => (
                  <div
                    key={player.user_id}
                    className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-4 py-3"
                  >
                    <div className="w-8 h-8 bg-[#3a3a3a] rounded-full flex items-center justify-center text-gray-400">
                      <UserIcon />
                    </div>
                    <span className="flex-1 text-sm truncate">{player.nombre}</span>
                    {player.ready && <CheckIcon />}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="w-80 bg-[#1a1a1a] border-l border-[#3a3a3a] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <section className="bg-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon />
              <h2 className="text-xs font-bold text-gray-400 uppercase">Leaderboard</h2>
            </div>
            {top10.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <p className="text-xs">Sin rankings aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {top10.map((rank, idx) => (
                  <div
                    key={rank.user_id}
                    className={`flex items-center gap-3 bg-[#1a1a1a] rounded px-3 py-2 ${
                      rank.user_id === user?.id ? 'bg-orange-500/20 border border-orange-500/50' : ''
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-[#3a3a3a] text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-xs truncate">{rank.nombre}</span>
                    <span className="text-sm font-bold text-orange-400">{rank.score}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <HistoryIcon />
              <h2 className="text-xs font-bold text-gray-400 uppercase">Historial de Casos</h2>
            </div>
            <div className="space-y-3">
              {HISTORICAL_CASES.map((caseItem, idx) => (
                <div key={idx} className="bg-[#1a1a1a] rounded-lg px-3 py-3">
                  <div className="text-xs font-semibold text-white truncate">{caseItem.case_name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-500">{caseItem.date}</span>
                    <span className="text-xs font-bold text-green-400">{caseItem.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
