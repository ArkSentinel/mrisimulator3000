import { useState, useEffect } from 'react';
import { API_BASE } from '../../../config/api';

interface Stats {
  total_users: number;
  total_exams: number;
  avg_score: number;
  sessions_today: number;
  top_students: Array<{ nombre: string; score: number; exams: number }>;
  recent_activity: Array<{ user: string; action: string; time: string }>;
}

const UsersIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ExamIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const ScoreIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const SessionIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrophyIcon = ({ rank }: { rank: number }) => (
  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
    rank === 0 ? 'bg-yellow-600' : rank === 1 ? 'bg-gray-400' : rank === 2 ? 'bg-orange-700' : 'bg-slate-700'
  }`}>
    {rank + 1}
  </span>
);

export function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1f1f1f] border border-slate-700 rounded p-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase">
            <UsersIcon />
            <span>Total Users</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.total_users || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">
            {(stats?.total_users ?? 0) > 0 ? '+12% this month' : 'No data'}
          </div>
        </div>

        <div className="bg-[#1f1f1f] border border-slate-700 rounded p-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase">
            <ExamIcon />
            <span>Total Exams</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.total_exams || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">
            {(stats?.total_exams ?? 0) > 0 ? '+8% this week' : 'No data'}
          </div>
        </div>

        <div className="bg-[#1f1f1f] border border-slate-700 rounded p-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase">
            <ScoreIcon />
            <span>Average Score</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.avg_score ? stats.avg_score.toFixed(1) : '0'}%
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            {(stats?.avg_score ?? 0) >= 70 ? 'Good performance' : 'Needs improvement'}
          </div>
        </div>

        <div className="bg-[#1f1f1f] border border-slate-700 rounded p-4">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase">
            <SessionIcon />
            <span>Sessions Today</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.sessions_today || 0}</div>
          <div className="text-[10px] text-gray-500 mt-1">Active sessions</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1f1f1f] border border-slate-700 rounded">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
              <TrophyIcon rank={0} />
              <span>Top Students</span>
            </h3>
          </div>
          <div className="p-3">
            {stats?.top_students && stats.top_students.length > 0 ? (
              stats.top_students.map((student, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <TrophyIcon rank={i} />
                    <span className="text-xs text-white">{student.nombre}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-400">{student.score.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500">{student.exams} exams</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 py-4 text-center">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-[#1f1f1f] border border-slate-700 rounded">
          <div className="p-3 border-b border-slate-700">
            <h3 className="text-xs font-bold text-gray-400 uppercase">Recent Activity</h3>
          </div>
          <div className="p-3">
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div>
                    <div className="text-xs text-white">{activity.user}</div>
                    <div className="text-[10px] text-gray-500">{activity.action}</div>
                  </div>
                  <div className="text-[10px] text-gray-500">{activity.time}</div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 py-4 text-center">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
