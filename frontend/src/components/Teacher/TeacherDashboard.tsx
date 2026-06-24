import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSessionSocket, type Phase, type StudentRank, type LeaderboardPayload } from '../../hooks/useSessionSocket';

interface Student {
  user_id: number;
  nombre: string;
  ready: boolean;
  score: number;
  submitted: boolean;
}

interface Protocol {
  id: number;
  nombre: string;
  descripcion: string;
  anatomical_region: string;
  indications: string;
}

interface Sequence {
  id: number;
  nombre_secuencia: string;
  plane: string;
  tr_default: number;
  te_default: number;
}

interface Session {
  id: string;
  protocol_id: number;
  phase: Phase;
}

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    <path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="1.5" />
    <path d="M5 15V5a2 2 0 012-2h10" strokeWidth="1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
    <path d="M8 12l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
    <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeWidth="1.5" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="5,3 19,12 5,21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="4" width="4" height="16" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="14" y="4" width="4" height="16" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M8 21h8M12 17v4M7 4h10M7 4v4a5 5 0 0010 0V4M7 4H4v3a3 3 0 003 3M17 4h3v3a3 3 0 01-3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<number>(1);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [rankings, setRankings] = useState<StudentRank[]>([]);
  const [phase, setPhase] = useState<Phase>('BRIEFING');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loadingProtocols, setLoadingProtocols] = useState(true);

  const handleLeaderboard = useCallback((data: LeaderboardPayload) => {
    setRankings(data.rankings);
    setPhase(data.phase);
  }, []);

  const handlePhaseChange = useCallback((newPhase: Phase, _timer: number) => {
    setPhase(newPhase);
    setElapsedTime(0);
  }, []);

  const handleStudentJoin = useCallback((userId: number, nombre: string) => {
    setStudents(prev => {
      if (prev.find(s => s.user_id === userId)) return prev;
      return [...prev, { user_id: userId, nombre, ready: false, score: 0, submitted: false }];
    });
  }, []);

  const handleStudentLeave = useCallback((userId: number) => {
    setStudents(prev => prev.filter(s => s.user_id !== userId));
  }, []);

  const handleStudentReady = useCallback((userId: number, ready: boolean) => {
    setStudents(prev => prev.map(s => s.user_id === userId ? { ...s, ready } : s));
  }, []);

  const handleAllReady = useCallback(() => {
    console.log('All students ready');
  }, []);

  const {
    connected,
    connect,
    disconnect,
    startSession,
    pauseSession,
    resumeSession,
  } = useSessionSocket({
    sessionId: session?.id || '',
    userId: user?.id || 0,
    role: 'teacher',
    onLeaderboard: handleLeaderboard,
    onPhaseChange: handlePhaseChange,
    onStudentJoin: handleStudentJoin,
    onStudentLeave: handleStudentLeave,
    onStudentReady: handleStudentReady,
    onAllReady: handleAllReady,
  });

  useEffect(() => {
    fetch('http://localhost:3000/api/protocols', {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setProtocols(data);
        setLoadingProtocols(false);
        if (data.length > 0 && !selectedProtocolId) {
          setSelectedProtocolId(data[0].id);
        }
      })
      .catch(() => setLoadingProtocols(false));
  }, []);

  useEffect(() => {
    if (selectedProtocolId) {
      fetch(`http://localhost:3000/api/protocols/${selectedProtocolId}/sequences`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      })
        .then(res => res.json())
        .then(data => setSequences(data))
        .catch(() => {});
    }
  }, [selectedProtocolId]);

  useEffect(() => {
    if (session?.id && user?.id) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [session?.id, user?.id, connect, disconnect]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSession = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('mri_token')}`
        },
        body: JSON.stringify({ protocol_id: selectedProtocolId })
      });
      if (res.ok) {
        const created: Session = await res.json();
        setSession(created);
        setStudents([]);
        setRankings([]);
        setPhase('BRIEFING');
      }
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  };

  const handleStart = () => {
    if (session) startSession();
  };

  const handlePause = () => {
    if (session) pauseSession();
  };

  const handleResume = () => {
    if (session) resumeSession();
  };

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/');
  };

  const copyPin = () => {
    if (session?.id) {
      navigator.clipboard.writeText(session.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedProtocol = protocols.find(p => p.id === selectedProtocolId);
  const pin = session?.id || '';
  const displayPin = pin ? `${pin.slice(0, 4)}-${pin.slice(4, 8)}` : '----';

  const getPhaseLabel = (p: Phase) => {
    switch (p) {
      case 'BRIEFING': return 'Briefing';
      case 'SIMULATION': return 'Simulación';
      case 'ACQUISITION': return 'Adquisición';
      case 'PODIUM': return 'Podio';
      default: return p;
    }
  };

  const getPhaseColor = (p: Phase) => {
    switch (p) {
      case 'BRIEFING': return 'text-blue-400';
      case 'SIMULATION': return 'text-green-400';
      case 'ACQUISITION': return 'text-yellow-400';
      case 'PODIUM': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <header className="h-14 bg-[#1a1a1a] border-b border-[#3a3a3a] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 6v6l4 2M12 2a10 10 0 100 20 10 10 0 000-20z" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-purple-400">Panel Docente</h1>
            <p className="text-[10px] text-gray-500">MCP-MRISimulator</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">{connected ? 'Conectado' : 'Desconectado'}</span>
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
        <aside className="w-72 bg-[#1a1a1a] border-r border-[#3a3a3a] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          <section className="bg-[#3a3a3a] rounded-lg p-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Sesión</h2>
            
            {!session ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Protocolo</label>
                  <select
                    value={selectedProtocolId}
                    onChange={e => setSelectedProtocolId(parseInt(e.target.value))}
                    className="w-full h-9 bg-[#232323] border border-[#4a4a4a] rounded px-2 text-sm text-white mt-1"
                    disabled={loadingProtocols}
                  >
                    {protocols.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCreateSession}
                  className="w-full h-10 bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Crear Nueva Sala
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Código PIN</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-12 bg-[#232323] rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-mono font-bold tracking-wider text-purple-400">{displayPin}</span>
                    </div>
                    <button
                      onClick={copyPin}
                      className="h-12 w-12 bg-[#4a4a4a] hover:bg-[#5a5a5a] rounded-lg flex items-center justify-center transition-colors"
                      title="Copiar PIN"
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClockIcon />
                    <span className="text-xs text-gray-400">Fase:</span>
                    <span className={`text-sm font-semibold ${getPhaseColor(phase)}`}>{getPhaseLabel(phase)}</span>
                  </div>
                  <span className="text-xl font-mono font-bold text-white">{formatTime(elapsedTime)}</span>
                </div>

                <div className="flex gap-2">
                  {phase === 'BRIEFING' && (
                    <button
                      onClick={handleStart}
                      className="flex-1 h-10 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <PlayIcon />
                      Iniciar
                    </button>
                  )}
                  {phase === 'SIMULATION' && (
                    <>
                      <button
                        onClick={handlePause}
                        className="flex-1 h-10 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <PauseIcon />
                        Pausar
                      </button>
                      <button
                        onClick={handleResume}
                        className="flex-1 h-10 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2"
                      >
                        <PlayIcon />
                        Reanudar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {selectedProtocol && (
            <section className="bg-[#3a3a3a] rounded-lg p-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Protocolo</h2>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-purple-400">{selectedProtocol.nombre}</div>
                <div className="text-xs text-gray-500">{selectedProtocol.anatomical_region}</div>
                <div className="text-[10px] text-gray-600 mt-2 uppercase">Secuencias</div>
                <div className="space-y-1">
                  {sequences.map(seq => (
                    <div key={seq.id} className="flex items-center justify-between text-xs bg-[#232323] rounded px-2 py-1">
                      <span className="text-gray-300">{seq.nombre_secuencia}</span>
                      <span className="text-gray-500">{seq.plane}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </aside>

        <main className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-400 uppercase">Progreso de Estudiantes ({students.length})</h2>
            <div className="text-xs text-gray-500">
              {students.filter(s => s.ready).length} / {students.length} listos
            </div>
          </div>

          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <UserIcon />
              <p className="mt-2 text-sm">Esperando estudiantes...</p>
              <p className="text-xs mt-1">Comparte el PIN para que se unan</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {students.map(student => (
                <div
                  key={student.user_id}
                  className={`bg-[#3a3a3a] rounded-lg p-4 border-2 transition-colors ${
                    student.ready ? 'border-green-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#4a4a4a] rounded-full flex items-center justify-center">
                      <UserIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{student.nombre}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {student.ready ? (
                          <span className="text-green-400 flex items-center gap-1 text-[10px]">
                            <CheckIcon />
                            Listo
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Esperando</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#232323] rounded px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase">Puntaje</span>
                    <span className="text-lg font-bold text-orange-400">{student.score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="w-72 bg-[#1a1a1a] border-l border-[#3a3a3a] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          {selectedProtocol && (
            <section className="bg-[#3a3a3a] rounded-lg p-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">Caso Clínico</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase">Región</span>
                  <span className="text-xs text-white">{selectedProtocol.anatomical_region}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase">Indicación</span>
                  <span className="text-xs text-white text-right">{selectedProtocol.indications}</span>
                </div>
              </div>
            </section>
          )}

          <section className="bg-[#3a3a3a] rounded-lg p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon />
              <h2 className="text-xs font-bold text-gray-400 uppercase">Leaderboard</h2>
            </div>

            {rankings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <p className="text-xs">Sin rankings aún</p>
              </div>
            ) : phase === 'PODIUM' ? (
              <div className="space-y-3">
                <div className="flex justify-center gap-2 mb-4">
                  {rankings.slice(0, 3).map((rank, idx) => (
                    <div
                      key={rank.user_id}
                      className={`flex flex-col items-center ${
                        idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'
                      }`}>
                        <span className="text-lg font-bold text-white">{idx + 1}</span>
                      </div>
                      <span className="text-[10px] mt-1 text-gray-400 truncate max-w-[60px]">{rank.nombre}</span>
                      <span className="text-sm font-bold text-white">{rank.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {rankings.map((rank, idx) => (
                  <div
                    key={rank.user_id}
                    className="flex items-center gap-3 bg-[#232323] rounded px-3 py-2"
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
        </aside>
      </div>
    </div>
  );
}
