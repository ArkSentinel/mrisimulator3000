import { useState, useEffect, useRef } from 'react';

function getSequenceDefaults(name: string): Partial<SequenceFormData> {
  const upper = name.toUpperCase();
  const lower = name.toLowerCase();

  if (lower.includes('t1') && (lower.includes('se') || lower.includes('spin echo'))) {
    return { tr_default: '500', te_default: '20', flip_default: '70', averages_default: '2' };
  }
  if (lower.includes('t1') && lower.includes('gradient')) {
    return { tr_default: '200', te_default: '2.5', flip_default: '70', averages_default: '1' };
  }
  if (lower.includes('t1') && (lower.includes('mprage') || lower.includes('spgr') || lower.includes('flash'))) {
    return { tr_default: '2300', te_default: '3.5', flip_default: '8', averages_default: '1' };
  }
  if (lower.includes('t1')) {
    return { tr_default: '500', te_default: '15', flip_default: '70', averages_default: '2' };
  }

  if (lower.includes('t2') && (lower.includes('tse') || lower.includes('fast spin'))) {
    return { tr_default: '4000', te_default: '100', flip_default: '150', averages_default: '2' };
  }
  if (lower.includes('t2') && lower.includes('flare')) {
    return { tr_default: '11000', te_default: '120', flip_default: '180', averages_default: '2' };
  }
  if (lower.includes('t2')) {
    return { tr_default: '4000', te_default: '100', flip_default: '90', averages_default: '2' };
  }

  if (lower.includes('flair')) {
    return { tr_default: '11000', te_default: '120', flip_default: '180', fat_suppression_default: 'None', averages_default: '2' };
  }

  if (lower.includes('dwi') || lower.includes('diffusion') || lower.includes('dw')) {
    return { tr_default: '4000', te_default: '100', flip_default: '90', averages_default: '4' };
  }

  if (lower.includes('tofmra') || lower.includes('time of flight') || lower.includes('3d tof')) {
    return { tr_default: '25', te_default: '7', flip_default: '20', fat_suppression_default: 'None', averages_default: '1' };
  }
  if (lower.includes('pcmra') || lower.includes('phase contrast') || lower.includes('pc-mra')) {
    return { tr_default: '15', te_default: '7', flip_default: '20', averages_default: '1' };
  }

  if (lower.includes('stir')) {
    return { tr_default: '4000', te_default: '70', flip_default: '150', fat_suppression_default: 'STIR', averages_default: '2' };
  }

  if (lower.includes('spiral')) {
    return { tr_default: '2000', te_default: '70', flip_default: '90', averages_default: '1' };
  }

  if (lower.includes('ep') || lower.includes('echo planar')) {
    return { tr_default: '3000', te_default: '90', flip_default: '90', averages_default: '1' };
  }

  if (lower.includes('susceptibility') || lower.includes('swi')) {
    return { tr_default: '30', te_default: '20', flip_default: '15', averages_default: '1' };
  }

  if (lower.includes('gradient') || lower.includes('gre')) {
    return { tr_default: '200', te_default: '4', flip_default: '70', averages_default: '1' };
  }

  return {};
}

interface Category {
  id: number;
  protocolo_id: number;
  nombre_secuencia: string;
  plane?: string;
  tr_default?: number | null;
  te_default?: number | null;
  fov_default?: number | null;
  slice_thickness?: number;
  tr_min?: number | null;
  tr_max?: number | null;
  te_min?: number | null;
  te_max?: number | null;
  fov_min?: number | null;
  fov_max?: number | null;
  flip_angle_min?: number | null;
  flip_angle_max?: number | null;
  slice_thickness_min?: number | null;
  slice_thickness_max?: number | null;
  matrix_min?: number | null;
  matrix_max?: number | null;
  nex_min?: number | null;
  nex_max?: number | null;
  orientation_default?: string | null;
  fat_suppression_default?: string | null;
  phase_encoding_default?: string | null;
  matrix_default?: string | null;
  flip_default?: number | null;
  averages_default?: number | null;
}

const API = 'http://localhost:3000/api';
const ADMIN_API = 'http://localhost:3000/api/admin';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('mri_token')}`
  };
}

export function ProtocolsEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ nombre: '', nombre_corto: '', icono: '', orden: 0 });

  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [protocolForm, setProtocolForm] = useState({ nombre: '', descripcion: '', anatomical_region: '', indications: '' });

  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [sequenceForm, setSequenceForm] = useState({
    nombre_secuencia: '', plane: 'Axial', tr_default: '4000', te_default: '100',
    fov_default: '220', slice_thickness: '3', matrix_default: '320x320',
    flip_default: '150',       orientation_default: 'RL', fat_suppression_default: 'None',
    tr_min: '500', tr_max: '10000', te_min: '10', te_max: '200',
    fov_min: '150', fov_max: '400', averages_default: '2'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadProtocols(selectedCategory.id);
    } else {
      setProtocols([]);
    }
  }, [selectedCategory]);

  const lastLoadedProtocolId = useRef<number | null>(null);

  useEffect(() => {
    if (selectedProtocol && selectedProtocol.id !== lastLoadedProtocolId.current) {
      lastLoadedProtocolId.current = selectedProtocol.id;
      loadProtocolDetail(selectedProtocol.id);
    }
  }, [selectedProtocol?.id]);

  async function loadCategories() {
    try {
      const token = localStorage.getItem('mri_token');
      const res = await fetch(`${ADMIN_API}/categories`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        console.error('Failed to load categories:', res.status, await res.text());
        setCategories([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setCategories([]);
      setLoading(false);
    }
  }

  async function loadProtocols(categoryId: number) {
    try {
      const res = await fetch(`${ADMIN_API}/protocols?category_id=${categoryId}`, { headers: getHeaders() });
      if (!res.ok) {
        setProtocols([]);
        return;
      }
      const data = await res.json();
      setProtocols(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setProtocols([]);
    }
  }

  async function loadProtocolDetail(protocolId: number) {
    try {
      const res = await fetch(`${API}/protocols/${protocolId}`, { headers: getHeaders() });
      const data = await res.json();
      if (selectedProtocol?.id === protocolId) {
        setSelectedProtocol(data);
      }
      setProtocols(prev => prev.map(p => p.id === data.id ? data : p));
    } catch (e) {
      console.error(e);
    }
  }

  function handleCategoryClick(cat: Category) {
    setSelectedCategory(cat);
    setSelectedProtocol(null);
    setSelectedSequence(null);
  }

  function openNewCategory() {
    setEditingCategory(null);
    setCategoryForm({ nombre: '', nombre_corto: '', icono: '', orden: categories.length + 1 });
    setShowCategoryModal(true);
  }

  function openEditCategory(cat: Category) {
    setEditingCategory(cat);
    setCategoryForm({ nombre: cat.nombre, nombre_corto: cat.nombre_corto, icono: cat.icono || '', orden: cat.orden });
    setShowCategoryModal(true);
  }

  async function saveCategory() {
    setSaving(true);
    try {
      if (editingCategory) {
        await fetch(`${ADMIN_API}/categories/${editingCategory.id}`, {
          method: 'PUT', headers: getHeaders(),
          body: JSON.stringify(categoryForm)
        });
      } else {
        await fetch(`${ADMIN_API}/categories`, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify(categoryForm)
        });
      }
      await loadCategories();
      setShowCategoryModal(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function deleteCategory(id: number) {
    if (!confirm('Delete this category?')) return;
    try {
      await fetch(`${ADMIN_API}/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (selectedCategory?.id === id) setSelectedCategory(null);
      await loadCategories();
    } catch (e) {
      console.error(e);
    }
  }

  function openNewProtocol() {
    setEditingProtocol(null);
    setProtocolForm({ nombre: '', descripcion: '', anatomical_region: '', indications: '' });
    setShowProtocolModal(true);
  }

  function openEditProtocol(protocol: Protocol) {
    setEditingProtocol(protocol);
    setProtocolForm({
      nombre: protocol.nombre,
      descripcion: protocol.descripcion || '',
      anatomical_region: protocol.anatomical_region || '',
      indications: protocol.indications || ''
    });
    setShowProtocolModal(true);
  }

  async function saveProtocol() {
    if (!selectedCategory) return;
    setSaving(true);
    try {
      if (editingProtocol) {
        await fetch(`${ADMIN_API}/protocols/${editingProtocol.id}`, {
          method: 'PUT', headers: getHeaders(),
          body: JSON.stringify(protocolForm)
        });
      } else {
        await fetch(`${ADMIN_API}/protocols`, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify({ ...protocolForm, category_id: selectedCategory.id })
        });
      }
      await loadProtocols(selectedCategory.id);
      setShowProtocolModal(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function deleteProtocol(id: number) {
    if (!confirm('Delete this protocol and all its sequences?')) return;
    try {
      await fetch(`${ADMIN_API}/protocols/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (selectedProtocol?.id === id) setSelectedProtocol(null);
      await loadProtocols(selectedCategory!.id);
    } catch (e) {
      console.error(e);
    }
  }

  function openNewSequence() {
    setEditingSequence(null);
    setSequenceForm({
      nombre_secuencia: '', plane: 'Axial', tr_default: '', te_default: '',
      fov_default: '220', slice_thickness: '3', matrix_default: '320x320',
      flip_default: '',       orientation_default: 'RL', fat_suppression_default: 'None',
      tr_min: '', tr_max: '', te_min: '', te_max: '',
      fov_min: '150', fov_max: '400', averages_default: '2'
    });
    setShowSequenceModal(true);
  }

  function openEditSequence(seq: Sequence) {
    setEditingSequence(seq);
    setSequenceForm({
      nombre_secuencia: seq.nombre_secuencia,
      plane: seq.plane || 'Axial',
      tr_default: seq.tr_default != null ? String(seq.tr_default) : '',
      te_default: seq.te_default != null ? String(seq.te_default) : '',
      fov_default: seq.fov_default != null ? String(seq.fov_default) : '',
      slice_thickness: seq.slice_thickness != null ? String(seq.slice_thickness) : '3',
      matrix_default: seq.matrix_default || '320x320',
      flip_default: seq.flip_default != null ? String(seq.flip_default) : '',
      orientation_default: seq.orientation_default || 'RL',
      fat_suppression_default: seq.fat_suppression_default || 'None',
      tr_min: seq.tr_min != null ? String(seq.tr_min) : '',
      tr_max: seq.tr_max != null ? String(seq.tr_max) : '',
      te_min: seq.te_min != null ? String(seq.te_min) : '',
      te_max: seq.te_max != null ? String(seq.te_max) : '',
      fov_min: seq.fov_min != null ? String(seq.fov_min) : '',
      fov_max: seq.fov_max != null ? String(seq.fov_max) : '',
      averages_default: seq.averages_default != null ? String(seq.averages_default) : '2'
    });
    setShowSequenceModal(true);
  }

  async function saveSequence() {
    if (!selectedProtocol) return;
    setSaving(true);
    try {
      const parseNum = (val: string) => val === '' ? null : parseInt(val);

      const payload: Record<string, any> = {
        protocolo_id: selectedProtocol.id,
        nombre_secuencia: sequenceForm.nombre_secuencia,
        plane: sequenceForm.plane,
      };

      if (sequenceForm.tr_default !== '') payload.tr_default = parseInt(sequenceForm.tr_default);
      if (sequenceForm.te_default !== '') payload.te_default = parseInt(sequenceForm.te_default);
      if (sequenceForm.fov_default !== '') payload.fov_default = parseInt(sequenceForm.fov_default);
      if (sequenceForm.slice_thickness !== '') payload.slice_thickness_default = parseFloat(sequenceForm.slice_thickness);
      if (sequenceForm.tr_min !== '') payload.tr_min = parseInt(sequenceForm.tr_min);
      if (sequenceForm.tr_max !== '') payload.tr_max = parseInt(sequenceForm.tr_max);
      if (sequenceForm.te_min !== '') payload.te_min = parseInt(sequenceForm.te_min);
      if (sequenceForm.te_max !== '') payload.te_max = parseInt(sequenceForm.te_max);
      if (sequenceForm.fov_min !== '') payload.fov_min = parseInt(sequenceForm.fov_min);
      if (sequenceForm.fov_max !== '') payload.fov_max = parseInt(sequenceForm.fov_max);
      if (sequenceForm.flip_default !== '') payload.flip_angle_min = parseInt(sequenceForm.flip_default);
      if (sequenceForm.orientation_default !== '') payload.orientation_default = sequenceForm.orientation_default;
      if (sequenceForm.fat_suppression_default !== '') payload.fat_suppression_default = sequenceForm.fat_suppression_default;
      if (sequenceForm.averages_default !== '') payload.averages_default = parseInt(sequenceForm.averages_default);

      if (editingSequence) {
        await fetch(`${ADMIN_API}/sequences/${editingSequence.id}`, {
          method: 'PUT', headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${ADMIN_API}/sequences`, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      }
      await loadProtocolDetail(selectedProtocol.id);
      setShowSequenceModal(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function deleteSequence(id: number) {
    if (!confirm('Delete this sequence?')) return;
    try {
      await fetch(`${ADMIN_API}/sequences/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (selectedProtocol) await loadProtocolDetail(selectedProtocol.id);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-64 border-r border-slate-700 flex flex-col bg-[#0f0f0f]">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">Regions</h3>
          <button onClick={openNewCategory} className="text-xs text-emerald-500 hover:text-emerald-400">+</button>
        </div>
        <div className="flex-1 overflow-auto">
          {categories.map(cat => (
            <div key={cat.id} className="border-b border-slate-800">
              <div
                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                  selectedCategory?.id === cat.id ? 'bg-orange-900/20 border-l-2 border-l-orange-500' : 'hover:bg-[#1a1a1a]'
                }`}
              >
                <div onClick={() => handleCategoryClick(cat)} className="flex-1">
                  <div className="text-xs font-medium text-white">{cat.nombre}</div>
                  <div className="text-[10px] text-gray-500">{cat.nombre_corto}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditCategory(cat)} className="text-[10px] text-gray-500 hover:text-white p-1">✎</button>
                  <button onClick={() => deleteCategory(cat.id)} className="text-[10px] text-gray-500 hover:text-red-500 p-1">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-72 border-r border-slate-700 flex flex-col bg-[#0f0f0f]">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">
            {selectedCategory ? `Protocols - ${selectedCategory.nombre}` : 'Select a region'}
          </h3>
          {selectedCategory && (
            <button onClick={openNewProtocol} className="text-xs text-emerald-500 hover:text-emerald-400">+</button>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {!selectedCategory ? (
            <div className="p-4 text-center text-gray-500 text-xs">Select a region to see protocols</div>
          ) : protocols.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">No protocols in this region</div>
          ) : (
            protocols.map(protocol => (
              <div key={protocol.id} className="border-b border-slate-800">
                <div
                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                    selectedProtocol?.id === protocol.id ? 'bg-orange-900/20 border-l-2 border-l-orange-500' : 'hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div onClick={() => setSelectedProtocol(protocol)} className="flex-1">
                    <div className="text-xs font-medium text-white">{protocol.nombre}</div>
                    <div className="text-[10px] text-gray-500">{protocol.secuencias?.length || 0} sequences</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditProtocol(protocol)} className="text-[10px] text-gray-500 hover:text-white p-1">✎</button>
                    <button onClick={() => deleteProtocol(protocol.id)} className="text-[10px] text-gray-500 hover:text-red-500 p-1">✕</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">
            {selectedProtocol ? `Sequences - ${selectedProtocol.nombre}` : 'Select a protocol'}
          </h3>
          {selectedProtocol && (
            <button onClick={openNewSequence} className="text-xs text-emerald-500 hover:text-emerald-400">+ Add Sequence</button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {!selectedProtocol ? (
            <div className="text-center text-gray-500 text-xs">Select a protocol to see sequences</div>
          ) : selectedProtocol.secuencias?.length === 0 ? (
            <div className="text-center text-gray-500 text-xs">No sequences in this protocol</div>
          ) : (
            <div className="space-y-3">
              {selectedProtocol.secuencias?.map(seq => (
                <div key={seq.id} className="bg-[#1f1f1f] border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{seq.nombre_secuencia}</h4>
                      <span className="text-[10px] text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded mt-1 inline-block">{seq.plane}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditSequence(seq)} className="text-xs text-blue-500 hover:text-blue-400">Edit</button>
                      <button onClick={() => deleteSequence(seq.id)} className="text-xs text-red-500 hover:text-red-400">Delete</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    <div className="bg-[#151515] rounded p-2">
                      <span className="text-gray-500 block">TR</span>
                      <span className="text-white">{seq.tr_default}</span>
                    </div>
                    <div className="bg-[#151515] rounded p-2">
                      <span className="text-gray-500 block">TE</span>
                      <span className="text-white">{seq.te_default}</span>
                    </div>
                    <div className="bg-[#151515] rounded p-2">
                      <span className="text-gray-500 block">FoV</span>
                      <span className="text-white">{seq.fov_default}</span>
                    </div>
                    <div className="bg-[#151515] rounded p-2">
                      <span className="text-gray-500 block">Slice</span>
                      <span className="text-white">{seq.slice_thickness}mm</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-slate-700 rounded-lg p-6 w-96">
            <h3 className="text-sm font-bold text-white mb-4">{editingCategory ? 'Edit Region' : 'New Region'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Name</label>
                <input value={categoryForm.nombre} onChange={e => setCategoryForm({...categoryForm, nombre: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Short Name</label>
                <input value={categoryForm.nombre_corto} onChange={e => setCategoryForm({...categoryForm, nombre_corto: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Icon (emoji)</label>
                <input value={categoryForm.icono} onChange={e => setCategoryForm({...categoryForm, icono: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Order</label>
                <input type="number" value={categoryForm.orden} onChange={e => setCategoryForm({...categoryForm, orden: parseInt(e.target.value) || 0})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveCategory} disabled={saving}
                className="flex-1 h-8 bg-emerald-600 text-xs rounded text-white disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 h-8 bg-gray-700 text-xs rounded text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showProtocolModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-slate-700 rounded-lg p-6 w-[500px]">
            <h3 className="text-sm font-bold text-white mb-4">{editingProtocol ? 'Edit Protocol' : 'New Protocol'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Name</label>
                <input value={protocolForm.nombre} onChange={e => setProtocolForm({...protocolForm, nombre: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Description</label>
                <textarea value={protocolForm.descripcion} onChange={e => setProtocolForm({...protocolForm, descripcion: e.target.value})}
                  className="w-full h-20 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1 resize-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Anatomical Region</label>
                <input value={protocolForm.anatomical_region} onChange={e => setProtocolForm({...protocolForm, anatomical_region: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Indications</label>
                <input value={protocolForm.indications} onChange={e => setProtocolForm({...protocolForm, indications: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveProtocol} disabled={saving}
                className="flex-1 h-8 bg-emerald-600 text-xs rounded text-white disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowProtocolModal(false)} className="flex-1 h-8 bg-gray-700 text-xs rounded text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSequenceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-slate-700 rounded-lg p-6 w-[600px] max-h-[90vh] overflow-auto">
            <h3 className="text-sm font-bold text-white mb-4">{editingSequence ? 'Edit Sequence' : 'New Sequence'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Sequence Name</label>
                <input value={sequenceForm.nombre_secuencia}
                  onChange={e => {
                    const name = e.target.value;
                    setSequenceForm(prev => {
                      const defaults = editingSequence ? {} : getSequenceDefaults(name);
                      return { ...prev, nombre_secuencia: name, ...defaults };
                    });
                  }}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Plane</label>
                  <select value={sequenceForm.plane} onChange={e => setSequenceForm({...sequenceForm, plane: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1">
                    <option value="Axial">Axial</option>
                    <option value="Coronal">Coronal</option>
                    <option value="Sagittal">Sagittal</option>
                    <option value="Oblique">Oblique</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TR (ms)</label>
                  <input value={sequenceForm.tr_default} onChange={e => setSequenceForm({...sequenceForm, tr_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">TE (ms)</label>
                  <input value={sequenceForm.te_default} onChange={e => setSequenceForm({...sequenceForm, te_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">FoV</label>
                  <input value={sequenceForm.fov_default} onChange={e => setSequenceForm({...sequenceForm, fov_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Slice (mm)</label>
                  <input value={sequenceForm.slice_thickness} onChange={e => setSequenceForm({...sequenceForm, slice_thickness: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Matrix</label>
                  <input value={sequenceForm.matrix_default} onChange={e => setSequenceForm({...sequenceForm, matrix_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Flip Angle</label>
                  <input value={sequenceForm.flip_default} onChange={e => setSequenceForm({...sequenceForm, flip_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Averages</label>
                  <input value={sequenceForm.averages_default} onChange={e => setSequenceForm({...sequenceForm, averages_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">Fat Suppression</label>
                  <select value={sequenceForm.fat_suppression_default} onChange={e => setSequenceForm({...sequenceForm, fat_suppression_default: e.target.value})}
                    className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1">
                    <option value="None">None</option>
                    <option value="SPIR">SPIR</option>
                    <option value="STIR">STIR</option>
                    <option value="SPAIR">SPAIR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Phase Encoding Direction</label>
                <select value={sequenceForm.orientation_default} onChange={e => setSequenceForm({...sequenceForm, orientation_default: e.target.value})}
                  className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white mt-1">
                  <option value="RL">R to L</option>
                  <option value="LR">L to R</option>
                  <option value="AP">A to P</option>
                  <option value="PA">P to A</option>
                  <option value="FH">F to H</option>
                  <option value="HF">H to F</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={saveSequence} disabled={saving}
                className="flex-1 h-8 bg-emerald-600 text-xs rounded text-white disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowSequenceModal(false)} className="flex-1 h-8 bg-gray-700 text-xs rounded text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
