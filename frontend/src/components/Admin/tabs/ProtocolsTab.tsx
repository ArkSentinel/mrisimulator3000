import { useState, useEffect } from 'react';
import { API_BASE } from '../../../config/api';

interface Protocol {
  id: number;
  nombre: string;
  descripcion: string;
  anatomical_region?: string;
  indications?: string;
  secuencias?: Sequence[];
}

interface Sequence {
  id: number;
  protocolo_id: number;
  nombre_secuencia: string;
  plane?: string;
  tr_default?: number | null;
  te_default?: number | null;
  fov_default?: number | null;
  slice_thickness_default?: number | null;
  matrix_default?: string | null;
}

export function ProtocolsTab() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProtocol, setShowAddProtocol] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/protocols', {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setProtocols(data);
        if (data.length > 0) setSelectedProtocol(data[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSelectProtocol = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    fetch(`${API_BASE}/protocols/${protocol.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setSelectedProtocol(data);
        setProtocols(prev => prev.map(p => p.id === data.id ? data : p));
      })
      .catch(console.error);
  };

  const handleAddProtocol = async () => {
    if (!newProtocolName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/admin/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mri_token')}` },
        body: JSON.stringify({ nombre: newProtocolName, descripcion: '' })
      });
      if (res.ok) {
        const created = await res.json();
        setProtocols([...protocols, created]);
        setSelectedProtocol(created);
        setShowAddProtocol(false);
        setNewProtocolName('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProtocol = async (id: number) => {
    if (!confirm('Delete this protocol and all its sequences?')) return;
    try {
      await fetch(`${API_BASE}/admin/protocols/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      });
      setProtocols(protocols.filter(p => p.id !== id));
      if (selectedProtocol?.id === id) setSelectedProtocol(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-1/3 border-r border-slate-700 flex flex-col">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">Protocols ({protocols.length})</h3>
          <button
            onClick={() => setShowAddProtocol(true)}
            className="text-xs text-orange-500 hover:text-orange-400"
          >
            + Add
          </button>
        </div>

        {showAddProtocol && (
          <div className="p-3 border-b border-slate-700 bg-[#252525]">
            <input
              type="text"
              placeholder="Protocol name"
              value={newProtocolName}
              onChange={(e) => setNewProtocolName(e.target.value)}
              className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mb-2"
            />
            <div className="flex gap-2">
              <button onClick={handleAddProtocol} className="flex-1 h-7 bg-emerald-600 text-xs rounded">Save</button>
              <button onClick={() => setShowAddProtocol(false)} className="flex-1 h-7 bg-gray-700 text-xs rounded">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {protocols.map((protocol) => (
            <button
              key={protocol.id}
              onClick={() => handleSelectProtocol(protocol)}
              className={`w-full p-3 text-left border-b border-slate-800 transition-colors ${
                selectedProtocol?.id === protocol.id
                  ? 'bg-orange-900/20 border-l-2 border-l-orange-500'
                  : 'hover:bg-[#252525]'
              }`}
            >
              <div className="text-xs font-medium text-white">{protocol.nombre}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                {protocol.secuencias?.length || 0} sequences
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">
            {selectedProtocol ? selectedProtocol.nombre : 'Select a protocol'}
          </h3>
          {selectedProtocol && (
            <button
              onClick={() => handleDeleteProtocol(selectedProtocol.id)}
              className="text-xs text-red-500 hover:text-red-400"
            >
              Delete Protocol
            </button>
          )}
        </div>

        {selectedProtocol ? (
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-4">
              <label className="text-xs text-gray-400">Description</label>
              <textarea
                value={selectedProtocol.descripcion || ''}
                onChange={(e) => setSelectedProtocol({ ...selectedProtocol, descripcion: e.target.value })}
                className="w-full h-20 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1 resize-none"
              />
            </div>

            <div className="text-xs text-gray-400 mb-2">Sequences ({selectedProtocol.secuencias?.length || 0})</div>
            <div className="space-y-2">
              {selectedProtocol.secuencias?.map((seq) => (
                <div key={seq.id} className="bg-[#1f1f1f] border border-slate-700 rounded p-3">
                  <div className="text-xs font-medium text-white">{seq.nombre_secuencia}</div>
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                    {seq.plane && <span>Plane: {seq.plane}</span>}
                    {seq.tr_default && <span>TR: {seq.tr_default}</span>}
                    {seq.te_default && <span>TE: {seq.te_default}</span>}
                    {seq.fov_default && <span>FoV: {seq.fov_default}</span>}
                    {seq.slice_thickness_default && <span>Slice: {seq.slice_thickness_default}mm</span>}
                    {seq.matrix_default && <span>Matrix: {seq.matrix_default}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
            Select a protocol to view details
          </div>
        )}
      </div>
    </div>
  );
}
