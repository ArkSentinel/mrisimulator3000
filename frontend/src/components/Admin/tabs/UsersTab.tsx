import { useState, useEffect } from 'react';
import { API_BASE } from '../../../config/api';

interface User {
  id: number;
  email: string;
  nombre: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const [newUser, setNewUser] = useState({ email: '', password: '', nombre: '', role: 'estudiante' });

  useEffect(() => {
    fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newUser.email || !newUser.password) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('mri_token')}`,
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        const created = await res.json();
        setUsers([...users, created]);
        setShowAdd(false);
        setNewUser({ email: '', password: '', nombre: '', role: 'estudiante' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      });
      setUsers(users.filter(u => u.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.nombre.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 bg-[#232323] border border-slate-700 px-3 text-xs text-white"
        />
        <button
          onClick={() => setShowAdd(true)}
          className="h-8 px-4 bg-orange-600 text-xs text-white rounded hover:bg-orange-500"
        >
          + Add User
        </button>
      </div>

      {showAdd && (
        <div className="p-4 border-b border-slate-700 bg-[#1f1f1f]">
          <div className="grid grid-cols-4 gap-3">
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Nombre"
              value={newUser.nombre}
              onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
              className="h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white"
            >
              <option value="estudiante">Estudiante</option>
              <option value="docente">Docente</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} className="px-4 py-1.5 bg-emerald-600 text-xs text-white rounded">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 bg-gray-700 text-xs text-white rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-[#1a1a1a] sticky top-0">
            <tr className="text-left text-[10px] text-gray-500 uppercase">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-800 hover:bg-[#1f1f1f]">
                <td className="px-4 py-2 text-xs text-gray-400">{user.id}</td>
                <td className="px-4 py-2 text-xs text-white">{user.email}</td>
                <td className="px-4 py-2 text-xs text-white">{user.nombre}</td>
                <td className="px-4 py-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    user.role === 'admin' ? 'bg-purple-900 text-purple-300' :
                    user.role === 'docente' ? 'bg-blue-900 text-blue-300' :
                    'bg-green-900 text-green-300'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-[10px] text-orange-500 hover:text-orange-400 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-[10px] text-red-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-slate-700 p-6 w-96 rounded">
            <h3 className="text-sm font-bold text-white mb-4">Edit User</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Nombre</label>
                <input
                  type="text"
                  value={editingUser.nombre}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                >
                  <option value="estudiante">Estudiante</option>
                  <option value="docente">Docente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={async () => {
                  try {
                    await fetch(`${API_BASE}/admin/users/${editingUser.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mri_token')}` },
                      body: JSON.stringify({ email: editingUser.email, nombre: editingUser.nombre, role: editingUser.role })
                    });
                    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
                    setEditingUser(null);
                  } catch (e) { console.error(e); }
                }}
                className="px-4 py-2 bg-emerald-600 text-xs text-white rounded"
              >
                Save
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-700 text-xs text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
