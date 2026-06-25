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
  orientation_default?: string;
  tr_default?: number | null;
  tr_min?: number | null;
  tr_max?: number | null;
  te_default?: number | null;
  te_min?: number | null;
  te_max?: number | null;
  fov_default?: number | null;
  fov_min?: number | null;
  fov_max?: number | null;
  slice_thickness?: number;
  slice_thickness_default?: number | null;
  matrix_default?: string | null;
  flip_default?: number | null;
  flip_angle_min?: number | null;
  flip_angle_max?: number | null;
  phase_encoding_default?: string | null;
  averages_default?: number | null;
  nex?: number | null;
  gap_percentage?: number | null;
  fat_suppression_default?: string | null;
  phase_partial_fourier_default?: string | null;
  phase_resolution_default?: number | null;
  phase_oversampling_default?: number | null;
  concatenations_default?: number | null;
  gradient_mode_default?: string | null;
  multiband_factor_default?: number | null;
  b_value_default?: number | null;
}

interface SequenceFormData {
  nombre_secuencia: string;
  plane: string;
  tr_default: string;
  tr_min: string;
  tr_max: string;
  te_default: string;
  te_min: string;
  te_max: string;
  fov_default: string;
  fov_min: string;
  fov_max: string;
  slice_thickness: string;
  matrix_default: string;
  flip_default: string;
  phase_encoding_default: string;
  averages_default: string;
  gap_percentage: string;
  fat_suppression_default: string;
  phase_partial_fourier_default: string;
}

const defaultFormData: SequenceFormData = {
  nombre_secuencia: '',
  plane: 'Axial',
  tr_default: '4000',
  tr_min: '500',
  tr_max: '10000',
  te_default: '100',
  te_min: '10',
  te_max: '200',
  fov_default: '220',
  fov_min: '150',
  fov_max: '400',
  slice_thickness: '3',
  matrix_default: '320x320',
  flip_default: '150',
  phase_encoding_default: 'R >> L',
  averages_default: '2',
  gap_percentage: '10',
  fat_suppression_default: 'None',
  phase_partial_fourier_default: 'Off',
};

export function ProtocolsEditor() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddProtocol, setShowAddProtocol] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState('');
  const [newProtocolDesc, setNewProtocolDesc] = useState('');

  const [sequenceForm, setSequenceForm] = useState<SequenceFormData>(defaultFormData);

  const loadProtocols = () => {
    setLoading(true);
    fetch(`${API_BASE}/admin/protocols`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setProtocols(data);
        if (data.length > 0 && !selectedProtocol) {
          selectProtocol(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const selectProtocol = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setSelectedSequence(null);
    setSequenceForm(defaultFormData);
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

  useEffect(() => {
    loadProtocols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddProtocol = async () => {
    if (!newProtocolName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/protocols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mri_token')}` },
        body: JSON.stringify({ nombre: newProtocolName, descripcion: newProtocolDesc })
      });
      if (res.ok) {
        const created = await res.json();
        setProtocols([...protocols, created]);
        setSelectedProtocol(created);
        setShowAddProtocol(false);
        setNewProtocolName('');
        setNewProtocolDesc('');
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteProtocol = async (id: number) => {
    if (!confirm('Delete this protocol and all its sequences?')) return;
    try {
      await fetch(`${API_BASE}/admin/protocols/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      });
      setProtocols(protocols.filter(p => p.id !== id));
      if (selectedProtocol?.id === id) {
        setSelectedProtocol(null);
        setSelectedSequence(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSequence = async () => {
    if (!selectedProtocol) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/protocols/sequences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mri_token')}` },
        body: JSON.stringify({
          protocolo_id: selectedProtocol.id,
          ...sequenceForm,
          tr_default: parseInt(sequenceForm.tr_default) || 4000,
          tr_min: parseInt(sequenceForm.tr_min) || 500,
          tr_max: parseInt(sequenceForm.tr_max) || 10000,
          te_default: parseInt(sequenceForm.te_default) || 100,
          te_min: parseInt(sequenceForm.te_min) || 10,
          te_max: parseInt(sequenceForm.te_max) || 200,
          fov_default: parseInt(sequenceForm.fov_default) || 220,
          fov_min: parseInt(sequenceForm.fov_min) || 150,
          fov_max: parseInt(sequenceForm.fov_max) || 400,
          slice_thickness: parseFloat(sequenceForm.slice_thickness) || 3,
          flip_default: parseInt(sequenceForm.flip_default) || 150,
          averages_default: parseInt(sequenceForm.averages_default) || 2,
          gap_percentage: parseFloat(sequenceForm.gap_percentage) || 10,
        })
      });
      if (res.ok) {
        const created = await res.json();
        setSelectedProtocol({
          ...selectedProtocol,
          secuencias: [...(selectedProtocol.secuencias || []), created]
        });
        setProtocols(protocols.map(p =>
          p.id === selectedProtocol.id
            ? { ...p, secuencias: [...(p.secuencias || []), created] }
            : p
        ));
        setSequenceForm(defaultFormData);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleUpdateSequence = async () => {
    if (!selectedSequence) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/protocols/sequences/${selectedSequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('mri_token')}` },
        body: JSON.stringify({
          ...sequenceForm,
          tr_default: parseInt(sequenceForm.tr_default) || null,
          tr_min: parseInt(sequenceForm.tr_min) || null,
          tr_max: parseInt(sequenceForm.tr_max) || null,
          te_default: parseInt(sequenceForm.te_default) || null,
          te_min: parseInt(sequenceForm.te_min) || null,
          te_max: parseInt(sequenceForm.te_max) || null,
          fov_default: parseInt(sequenceForm.fov_default) || null,
          fov_min: parseInt(sequenceForm.fov_min) || null,
          fov_max: parseInt(sequenceForm.fov_max) || null,
          slice_thickness: parseFloat(sequenceForm.slice_thickness) || null,
          flip_default: parseInt(sequenceForm.flip_default) || null,
          averages_default: parseInt(sequenceForm.averages_default) || null,
          gap_percentage: parseFloat(sequenceForm.gap_percentage) || null,
        })
      });
      if (res.ok) {
        const updated = await res.json();
        const updatedSecs = (selectedProtocol?.secuencias || []).map(s =>
          s.id === updated.id ? updated : s
        );
        if (selectedProtocol) {
          setSelectedProtocol({ ...selectedProtocol, secuencias: updatedSecs });
        }
        setSelectedSequence(null);
        setSequenceForm(defaultFormData);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteSequence = async (seqId: number) => {
    if (!confirm('Delete this sequence?')) return;
    try {
      await fetch(`${API_BASE}/admin/protocols/sequences/${seqId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      });
      if (selectedProtocol) {
        const updatedSecs = (selectedProtocol.secuencias || []).filter(s => s.id !== seqId);
        setSelectedProtocol({ ...selectedProtocol, secuencias: updatedSecs });
      }
      if (selectedSequence?.id === seqId) {
        setSelectedSequence(null);
        setSequenceForm(defaultFormData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySequence = async (seqId: number) => {
    if (!selectedProtocol) return;
    try {
      const res = await fetch(`${API_BASE}/admin/protocols/sequences/${seqId}/copy?target_protocol_id=${selectedProtocol.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('mri_token')}` }
      });
      if (res.ok) {
        loadProtocols();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const editSequence = (seq: Sequence) => {
    setSelectedSequence(seq);
    setSequenceForm({
      nombre_secuencia: seq.nombre_secuencia || '',
      plane: seq.plane || seq.orientation_default || 'Axial',
      tr_default: String(seq.tr_default ?? ''),
      tr_min: String(seq.tr_min ?? ''),
      tr_max: String(seq.tr_max ?? ''),
      te_default: String(seq.te_default ?? ''),
      te_min: String(seq.te_min ?? ''),
      te_max: String(seq.te_max ?? ''),
      fov_default: String(seq.fov_default ?? ''),
      fov_min: String(seq.fov_min ?? ''),
      fov_max: String(seq.fov_max ?? ''),
      slice_thickness: String(seq.slice_thickness_default ?? seq.slice_thickness ?? ''),
      matrix_default: seq.matrix_default || '320x320',
      flip_default: String(seq.flip_default ?? ''),
      phase_encoding_default: seq.phase_encoding_default || 'R >> L',
      averages_default: String(seq.averages_default ?? seq.nex ?? ''),
      gap_percentage: String(seq.gap_percentage ?? ''),
      fat_suppression_default: seq.fat_suppression_default || 'None',
      phase_partial_fourier_default: seq.phase_partial_fourier_default || 'Off',
    });
  };

  const cancelEdit = () => {
    setSelectedSequence(null);
    setSequenceForm(defaultFormData);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-slate-700 flex flex-col bg-[#0a0a0a]">
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
          <div className="p-3 border-b border-slate-700 bg-[#1f1f1f] space-y-2">
            <input
              type="text"
              placeholder="Protocol name"
              value={newProtocolName}
              onChange={(e) => setNewProtocolName(e.target.value)}
              className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white"
            />
            <textarea
              placeholder="Description (optional)"
              value={newProtocolDesc}
              onChange={(e) => setNewProtocolDesc(e.target.value)}
              className="w-full h-16 bg-[#232323] border border-slate-700 px-2 text-xs text-white resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddProtocol}
                disabled={saving}
                className="flex-1 h-7 bg-emerald-600 text-xs text-white rounded disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setShowAddProtocol(false); setNewProtocolName(''); setNewProtocolDesc(''); }}
                className="flex-1 h-7 bg-gray-700 text-xs text-white rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {protocols.map((protocol) => (
            <button
              key={protocol.id}
              onClick={() => selectProtocol(protocol)}
              className={`w-full p-3 text-left border-b border-slate-800 transition-colors ${
                selectedProtocol?.id === protocol.id
                  ? 'bg-orange-900/20 border-l-2 border-l-orange-500'
                  : 'hover:bg-[#1f1f1f]'
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold text-gray-400 uppercase">
            {selectedProtocol ? `${selectedProtocol.nombre} - Sequences` : 'Select a protocol'}
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
          <>
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                  Sequences ({selectedProtocol.secuencias?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedProtocol.secuencias?.map((seq) => (
                    <div
                      key={seq.id}
                      className={`bg-[#1f1f1f] border rounded p-3 cursor-pointer transition-colors ${
                        selectedSequence?.id === seq.id
                          ? 'border-orange-500'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => editSequence(seq)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-white">{seq.nombre_secuencia}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopySequence(seq.id); }}
                            className="text-[10px] text-blue-500 hover:text-blue-400"
                          >
                            Copy
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSequence(seq.id); }}
                            className="text-[10px] text-red-500 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-500">
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
            </div>

            <div className="border-t border-slate-700 bg-[#1a1a1a] p-4 shrink-0 max-h-[50%] overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase">
                  {selectedSequence ? 'Edit Sequence' : 'Add New Sequence'}
                </h4>
                {selectedSequence && (
                  <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-white">
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-4">
                  <label className="text-[10px] text-gray-500 uppercase">Sequence Name</label>
                  <input
                    type="text"
                    value={sequenceForm.nombre_secuencia}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, nombre_secuencia: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                    placeholder="e.g., T2 FLAIR"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Plane</label>
                  <select
                    value={sequenceForm.plane}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, plane: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  >
                    <option value="Axial">Axial</option>
                    <option value="Coronal">Coronal</option>
                    <option value="Sagittal">Sagittal</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TR Default</label>
                  <input
                    type="number"
                    value={sequenceForm.tr_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, tr_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TR Min</label>
                  <input
                    type="number"
                    value={sequenceForm.tr_min}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, tr_min: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TR Max</label>
                  <input
                    type="number"
                    value={sequenceForm.tr_max}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, tr_max: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TE Default</label>
                  <input
                    type="number"
                    value={sequenceForm.te_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, te_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TE Min</label>
                  <input
                    type="number"
                    value={sequenceForm.te_min}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, te_min: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TE Max</label>
                  <input
                    type="number"
                    value={sequenceForm.te_max}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, te_max: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">FoV Default</label>
                  <input
                    type="number"
                    value={sequenceForm.fov_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, fov_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Slice Thickness</label>
                  <input
                    type="number"
                    step="0.1"
                    value={sequenceForm.slice_thickness}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, slice_thickness: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Matrix</label>
                  <select
                    value={sequenceForm.matrix_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, matrix_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  >
                    <option value="256x256">256x256</option>
                    <option value="320x320">320x320</option>
                    <option value="384x384">384x384</option>
                    <option value="512x512">512x512</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Flip Angle</label>
                  <input
                    type="number"
                    value={sequenceForm.flip_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, flip_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Averages</label>
                  <input
                    type="number"
                    value={sequenceForm.averages_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, averages_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Gap %</label>
                  <input
                    type="number"
                    step="1"
                    value={sequenceForm.gap_percentage}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, gap_percentage: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Phase Encoding</label>
                  <select
                    value={sequenceForm.phase_encoding_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, phase_encoding_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  >
                    <option value="R >> L">R &gt;&gt; L</option>
                    <option value="L >> R">L &gt;&gt; R</option>
                    <option value="A >> P">A &gt;&gt; P</option>
                    <option value="P >> A">P &gt;&gt; A</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Fat Suppression</label>
                  <select
                    value={sequenceForm.fat_suppression_default}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, fat_suppression_default: e.target.value })}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1"
                  >
                    <option value="None">None</option>
                    <option value="FatSat">FatSat</option>
                    <option value="STIR">STIR</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={selectedSequence ? handleUpdateSequence : handleAddSequence}
                  disabled={saving || !sequenceForm.nombre_secuencia.trim()}
                  className="px-4 py-2 bg-emerald-600 text-xs text-white rounded disabled:opacity-50"
                >
                  {saving ? 'Saving...' : selectedSequence ? 'Update Sequence' : 'Add Sequence'}
                </button>
                {selectedSequence && (
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-700 text-xs text-white rounded"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
            Select a protocol to view and edit its sequences
          </div>
        )}
      </div>
    </div>
  );
}