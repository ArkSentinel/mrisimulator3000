import { useState, useEffect } from 'react';
import { API_BASE } from '../../../config/api';

interface Session {
  id: string;
  protocol_id: number;
  teacher_id: number;
  phase: string;
  student_count: number;
  created_at: string;
}

interface Protocol {
  id: number;
  nombre: string;
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [newSession, setNewSession] = useState({ protocol_id: 1, timer_briefing: 60, timer_simulation: 180 });

  const fetchSessions = () => {
    fetch(`${API_BASE}/sessions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
    fetch(`${API_BASE}/protocols`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => setProtocols(data))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mri_token')}` },
        body: JSON.stringify(newSession)
      });
      if (res.ok) {
        const created = await res.json();
        setSessions([...sessions, created]);
        setShowCreate(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Close this session?')) return;
    try {
      await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      });
      setSessions(sessions.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'BRIEFING': return 'bg-blue-900 text-blue-300';
      case 'SIMULATION': return 'bg-green-900 text-green-300';
      case 'ACQUISITION': return 'bg-yellow-900 text-yellow-300';
      case 'PODIUM': return 'bg-purple-900 text-purple-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase">Active Sessions ({sessions.length})</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="h-8 px-4 bg-orange-600 text-xs text-white rounded hover:bg-orange-500"
        >
          + New Session
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border-b border-slate-700 bg-[#1f1f1f]">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Protocol</label>
              <select
                value={newSession.protocol_id}
                onChange={(e) => setNewSession({ ...newSession, protocol_id: parseInt(e.target.value) })}
                className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
              >
                {protocols.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Briefing Timer (s)</label>
              <input
                type="number"
                value={newSession.timer_briefing}
                onChange={(e) => setNewSession({ ...newSession, timer_briefing: parseInt(e.target.value) })}
                className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Simulation Timer (s)</label>
              <input
                type="number"
                value={newSession.timer_simulation}
                onChange={(e) => setNewSession({ ...newSession, timer_simulation: parseInt(e.target.value) })}
                className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} className="px-4 py-1.5 bg-emerald-600 text-xs text-white rounded">Create Session</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 bg-gray-700 text-xs text-white rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-8">No active sessions</div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-[#1f1f1f] border border-slate-700 rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Session {session.id}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Protocol ID: {session.protocol_id} • Teacher ID: {session.teacher_id}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-1 rounded ${getPhaseColor(session.phase)}`}>
                      {session.phase}
                    </span>
                    <span className="text-xs text-gray-400">
                      {session.student_count} students
                    </span>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
