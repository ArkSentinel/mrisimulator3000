import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, Loader2, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import { API_BASE } from '../../config/api';
import { SequenceList } from '../Sidebar/SequenceList';
import { ControlButtons } from '../Sidebar/ControlButtons';
import { ViewportGrid } from '../Viewer/ViewportGrid';
import { ParamTabs } from '../ParameterPanel/ParamTabs';
import { ParamForm } from '../ParameterPanel/ParamForm';
import { paramTabs, parameterGroups, defaultParams, type ParameterGroup, type MRISequenceParams, type Sequence, type Protocol, type SatBand } from '../../data/mockData';
import { type FOVBox } from '../../core/fovMath';
import { useExam } from '../../context/ExamContext';
import { api } from '../../services/api';
import type { Sequence as BackendSequence } from '../../services/api';

type ProtocolData = Protocol;

type SequenceData = Sequence & { name: string; status: 'idle' | 'ready' | 'running' | 'completed' };

function calculateEstimatedTime(seq: SequenceData): number {
  const tr = seq.tr_default || seq.tr_min || seq.tr_max || 4000;
  const slices = 24;
  const averages = seq.averages_default || seq.nex || 2;
  const matrix = parseInt(seq.matrix_default?.split('x')[0] || '320');
  const partialFourier = seq.phase_partial_fourier_default === 'Off' ? 1 : 
                         seq.phase_partial_fourier_default === '7/8' ? 0.875 : 
                         seq.phase_partial_fourier_default === '6/8' ? 0.75 : 1;
  const concatenations = seq.concatenations_default || 1;
  
  const baseTime = (tr * slices * averages * partialFourier * concatenations) / 1000000;
  const matrixFactor = matrix > 384 ? 1.3 : matrix > 320 ? 1.1 : 1;
  const estimatedMinutes = Math.ceil(baseTime * matrixFactor * 1.2);
  
  return Math.max(1, estimatedMinutes);
}

const defaultFOV: FOVBox = {
  position: [0, 0, 0],
  size: {
    read: 220,
    phase: 178,
    depth: 72,
  },
};

export function ConsoleScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { exam } = useExam();
  const patientData = location.state as { patient?: Record<string, string>; protocol?: string } | undefined;

  const [protocols, setProtocols] = useState<ProtocolData[]>([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState<number | null>(null);
  const [sequences, setSequences] = useState<SequenceData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('routine');
  const [params, setParams] = useState<MRISequenceParams>(defaultParams);
  const [fovBox, setFovBox] = useState<FOVBox>(defaultFOV);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [scanActive, setScanActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [acquiredSlices, setAcquiredSlices] = useState(0);
  const totalSlices = params.slices || 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadSequenceParams = (seq: any) => {
    const s = seq;
    const trValue = s.tr_default ?? (s.tr_min && s.tr_max ? Math.round((s.tr_min + s.tr_max) / 2) : s.tr_min ?? s.tr_max ?? 4000);
    const teValue = s.te_default ?? (s.te_min && s.te_max ? Math.round((s.te_min + s.te_max) / 2) : s.te_min ?? s.te_max ?? 100);
    const fovValue = s.fov_default ?? (s.fov_min && s.fov_max ? Math.round((s.fov_min + s.fov_max) / 2) : s.fov_min ?? s.fov_max ?? 220);
    const sliceValue = s.slice_thickness ?? s.slice_thickness_default ?? 3.0;
    const slicesValue = s.slices_default ?? s.slices ?? 24;
    const gapValue = s.gap_percentage ?? s.gap_percentage_default ?? 10;
    const flipValue = s.flip_default ?? 150;
    const averagesValue = s.averages_default ?? s.nex ?? 2;
    const matrixBase = s.base_resolution_default ?? parseInt(s.matrix_default?.split('x')[0] || '320');
    const phaseResValue = s.phase_resolution_default ?? 100;

    const newParams: MRISequenceParams = {
      sliceGroup: 1,
      slices: slicesValue,
      sliceThickness: sliceValue,
      distanceFactor: gapValue,
      orientation: (s.orientation_default as 'Axial' | 'Sagittal' | 'Coronal') || s.plane as 'Axial' | 'Sagittal' | 'Coronal' || 'Axial',
      fovRead: fovValue,
      fovPhase: 81,
      tr: trValue,
      te: teValue,
      flipAngle: flipValue,
      averages: averagesValue,
      fatSuppression: (s.fat_suppression_default as 'None' | 'FatSat' | 'STIR') || 'None',
      baseResolution: matrixBase,
      phaseResolution: phaseResValue,
      phasePartialFourier: (s.phase_partial_fourier_default || 'Off') as 'Off' | '7/8' | '6/8',
      phaseEncodingDir: (s.phase_encoding_default as 'R >> L' | 'A >> P' | 'L >> R' | 'P >> A') || 'R >> L',
      phaseOversampling: s.phase_oversampling_default || 0,
      concatenations: s.concatenations_default || 1,
      coilElements: 'HEA; HEP',
      gradientMode: (s.gradient_mode_default as 'Normal' | 'Whisper' | 'Performance') || 'Normal',
      multibandFactor: s.multiband_factor_default || 1,
      sequenceName: s.nombre_secuencia,
      wc: 40,
      ww: 400,
      satBands: []
    };
    setParams(newParams);
  };

  const handleStartScan = () => {
    if (currentSequenceIndex < 0) return;
    
    // Verificar si la secuencia requiere setup
    const currentSeq = sequences[currentSequenceIndex];
    if (currentSeq.requiresSetup) {
      Swal.fire({
        title: '⚠️ Setup requerido',
        text: currentSeq.setupReason || 'Parámetros fuera de rango válido. Por favor ajuste los parámetros antes de ejecutar.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }
    
    const newSequences = [...sequences];
    newSequences[currentSequenceIndex] = { ...newSequences[currentSequenceIndex], status: 'running' };
    setSequences(newSequences);
    setScanActive(true);
    setScanProgress(0);
    setAcquiredSlices(0);
  };

  const handleStopScan = () => {
    setScanActive(false);
  };

  const handleFastForward = () => {
    if (!scanActive) return;
    const slicesToAdd = Math.min(5, totalSlices - acquiredSlices);
    const newAcquired = acquiredSlices + slicesToAdd;
    setAcquiredSlices(newAcquired);
    setScanProgress(Math.round((newAcquired / totalSlices) * 100));
    
    if (newAcquired >= totalSlices) {
      setScanActive(false);
      if (currentSequenceIndex >= 0 && currentSequenceIndex < sequences.length - 1) {
        const newSequences = [...sequences];
        newSequences[currentSequenceIndex] = { ...newSequences[currentSequenceIndex], status: 'completed' };
        const nextIdx = currentSequenceIndex + 1;
        newSequences[nextIdx] = { ...newSequences[nextIdx], status: 'running' };
        setSequences(newSequences);
        setSelectedId(newSequences[nextIdx].id);
        loadSequenceParams(newSequences[nextIdx]);
      }
    }
  };

  useEffect(() => {
    api.getProtocols().then(data => {
      setProtocols(data);

      const protocolIdFromScheduler = (location.state as { protocolId?: number })?.protocolId;
      const protocolIdFromContext = exam.protocolId;
      const targetProtocolId =
        (protocolIdFromScheduler && data.find((p: ProtocolData) => p.id === protocolIdFromScheduler))
          ? protocolIdFromScheduler
          : (protocolIdFromContext && data.find((p: ProtocolData) => p.id === protocolIdFromContext))
            ? protocolIdFromContext
            : data[0]?.id;

      if (targetProtocolId) {
        setSelectedProtocolId(targetProtocolId);
        api.getSequences(targetProtocolId).then((seqs: BackendSequence[]) => {
          const loadedSequences: SequenceData[] = seqs.map((seq: BackendSequence, idx: number) => ({
            ...seq,
            name: seq.nombre_secuencia,
            estimatedTime: calculateEstimatedTime(seq as unknown as SequenceData),
            status: (idx === 0 ? 'running' : idx === 1 ? 'ready' : 'idle') as 'idle' | 'ready' | 'running' | 'completed'
          }));
          setSequences(loadedSequences);
          if (loadedSequences.length > 0) {
            setSelectedId(loadedSequences[0].id);
            loadSequenceParams(loadedSequences[0]);
          }
        }).catch(() => setSequences([]));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [location.state, exam.protocolId]);

  // === INICIALIZACIÓN ÚNICA DEL FOV AL CARGAR SECUENCIA ===
  const initializeFOVFromParams = useCallback(() => {
    const gapBetweenSlices = params.sliceThickness * (params.distanceFactor / 100);
    const totalSliceHeight = params.sliceThickness + gapBetweenSlices;
    const depth = params.slices * totalSliceHeight;
    const phase = params.fovRead * (params.fovPhase / 100);
    
    return {
      position: [0, 0, 0] as [number, number, number],
      size: {
        read: params.fovRead,
        phase,
        depth,
      },
    };
  }, [params.fovRead, params.fovPhase, params.slices, params.sliceThickness, params.distanceFactor]);

  const [fovInitialized, setFovInitialized] = useState(false);
  useEffect(() => {
    if (!fovInitialized && sequences.length > 0) {
      const initialFOV = initializeFOVFromParams();
      setFovBox(initialFOV);
      setFovInitialized(true);
    }
  }, [sequences.length, fovInitialized, initializeFOVFromParams]);

  const handleProtocolChange = (protocolId: number) => {
    setSelectedProtocolId(protocolId);
    api.getSequences(protocolId).then((seqs: BackendSequence[]) => {
      const loadedSequences: SequenceData[] = seqs.map((seq: BackendSequence, idx: number) => ({
        ...seq,
        name: seq.nombre_secuencia,
        estimatedTime: calculateEstimatedTime(seq as unknown as SequenceData),
        status: (idx === 0 ? 'running' : idx === 1 ? 'ready' : 'idle') as 'idle' | 'ready' | 'running' | 'completed'
      }));
      setSequences(loadedSequences);
      if (loadedSequences.length > 0) {
        setSelectedId(loadedSequences[0].id);
        loadSequenceParams(loadedSequences[0]);
      }
    }).catch(() => {
      setSequences([]);
      setSelectedId(null);
    });
  };

  const selectedSequence = sequences.find(s => s.id === selectedId);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSequences(prev => {
      const newSeqs = [...prev];
      const [moved] = newSeqs.splice(fromIndex, 1);
      newSeqs.splice(toIndex, 0, moved);
      return newSeqs;
    });
  }, []);

  const handleSequenceSelect = (seq: SequenceData) => {
    loadSequenceParams(seq);
  };

  const currentSequenceIndex = sequences.findIndex(s => s.id === selectedId);
  const isRunning = currentSequenceIndex >= 0 && sequences[currentSequenceIndex]?.status === 'running';

  const handleSkipSequence = () => {
    if (currentSequenceIndex < 0 || currentSequenceIndex >= sequences.length - 1) return;
    const newSequences = [...sequences];
    newSequences[currentSequenceIndex] = { ...newSequences[currentSequenceIndex], status: 'completed' };
    const nextIndex = currentSequenceIndex + 1;
    newSequences[nextIndex] = { ...newSequences[nextIndex], status: 'running' };
    setSequences(newSequences);
    setSelectedId(newSequences[nextIndex].id);
    loadSequenceParams(newSequences[nextIndex]);
  };

  const handleStopSequence = () => {
    if (currentSequenceIndex < 0) return;
    const newSequences = [...sequences];
    newSequences[currentSequenceIndex] = { ...newSequences[currentSequenceIndex], status: 'idle' };
    setSequences(newSequences);
  };

  const handlePauseSequence = () => {
    if (currentSequenceIndex < 0 || !isRunning) return;
    const newSequences = [...sequences];
    newSequences[currentSequenceIndex] = { ...newSequences[currentSequenceIndex], status: 'idle' };
    setSequences(newSequences);
  };

const handleContinueSequence = () => {
    const idleIndex = sequences.findIndex(s => s.status === 'idle');
    if (idleIndex >= 0) {
      const newSequences = [...sequences];
      newSequences[idleIndex] = { ...newSequences[idleIndex], status: 'running' };
      setSequences(newSequences);
      setSelectedId(newSequences[idleIndex].id);
      loadSequenceParams(newSequences[idleIndex]);
    }
  };

  const handleCopyGo = () => {
    if (!selectedSequence) return;
    alert(`Sequence "${selectedSequence.name}" copied to scanner!`);
  };

  // Validar si la secuencia requiere setup (inconsistencias físicas)
  const checkRequiresSetup = (seqParams: MRISequenceParams): { requires: boolean; reason: string } => {
    const { slices, sliceThickness, distanceFactor, tr, fovRead, baseResolution } = seqParams;
    
    // Calcular coverage/time constraint
    const gap = sliceThickness * (distanceFactor / 100);
    const totalCoverage = slices * (sliceThickness + gap);
    const minTRforCoverage = totalCoverage * 2.5; // Aproximación
    
    if (tr < minTRforCoverage && slices > 10) {
      return { requires: true, reason: 'Conflicto de cobertura: TR muy bajo para número de slices' };
    }
    
    // SAR proxy: flip angle muy alto con muchos slices
    if (seqParams.flipAngle > 150 && slices > 20) {
      return { requires: true, reason: 'SAR可能会超标: Flip angle alto con muchos slices' };
    }
    
    // FoV muy pequeño para la resolución
    if (fovRead < 150 && baseResolution > 300) {
      return { requires: true, reason: 'FoV muy pequeño para la resolución seleccionada' };
    }
    
    // Slice thickness muy grande para el tipo de secuencia
    if (sliceThickness > 6) {
      return { requires: true, reason: 'Slice thickness muy grande puede causar artifacts' };
    }
    
    return { requires: false, reason: '' };
  };

  // Actualizar requiresSetup en las secuencias
  useEffect(() => {
    const updated = sequences.map(seq => {
      if (seq.status === 'idle' || seq.status === 'ready') {
        // Usar los parámetros actuales si es la secuencia seleccionada
        const seqParams = seq.id === selectedId ? params : defaultParams;
        const check = checkRequiresSetup(seqParams);
        return { ...seq, requiresSetup: check.requires, setupReason: check.reason };
      }
      return seq;
    });
    if (JSON.stringify(updated) !== JSON.stringify(sequences)) {
      setSequences(updated);
    }
  }, [params, selectedId, sequences.length]);

  // Acciones del menú contextual
  const handleOpenSequence = (seqId: number) => {
    const seq = sequences.find(s => s.id === seqId);
    if (seq) {
      setSelectedId(seqId);
      loadSequenceParams(seq);
    }
  };

  const handleRepeatSequence = (seqId: number) => {
    const seqIndex = sequences.findIndex(s => s.id === seqId);
    if (seqIndex < 0) return;
    
    const originalSeq = sequences[seqIndex];
    const newSeq: SequenceData = {
      ...originalSeq,
      id: Date.now(),
      name: `${originalSeq.name} (Repeat)`,
      status: 'ready',
      requiresSetup: false,
      setupReason: undefined
    };
    
    const newSequences = [...sequences];
    newSequences.splice(seqIndex + 1, 0, newSeq);
    setSequences(newSequences);
    setSelectedId(newSeq.id);
    loadSequenceParams(newSeq);
  };

  const handleDeleteSequence = (seqId?: number) => {
    const targetId = seqId ?? selectedId;
    if (targetId === null) return;
    const newSequences = sequences.filter(s => s.id !== targetId);
    if (newSequences.length > 0 && selectedId === targetId) {
      setSelectedId(newSequences[0].id);
      loadSequenceParams(newSequences[0]);
    } else if (newSequences.length === 0) {
      setSelectedId(null);
    }
    setSequences(newSequences);
  };

  const handleCopyAndGo = (seqId: number) => {
    const seq = sequences.find(s => s.id === seqId);
    if (!seq) return;
    
    const newSeq: SequenceData = {
      ...seq,
      id: Date.now(),
      name: `${seq.name} (Copy)`,
      status: 'running'
    };
    
    const seqIndex = sequences.findIndex(s => s.id === seqId);
    const newSequences = [...sequences];
    newSequences.splice(seqIndex + 1, 0, newSeq);
    setSequences(newSequences);
    setSelectedId(newSeq.id);
    loadSequenceParams(newSeq);
    setScanActive(true);
    setScanProgress(0);
    setAcquiredSlices(0);
  };

  const addSatBand = () => {
    const newBand: SatBand = {
      id: `sat-${Date.now()}`,
      x: 0,
      y: 0,
      width: 256,
      thickness: 25,
      angle: 0,
      enabled: true
    };
    setParams(prev => ({
      ...prev,
      satBands: [...prev.satBands, newBand]
    }));
  };

  const updateSatBand = (bandId: string, updates: Partial<SatBand>) => {
    setParams(prev => ({
      ...prev,
      satBands: prev.satBands.map(b => b.id === bandId ? { ...b, ...updates } : b)
    }));
  };

  const removeSatBand = (bandId: string) => {
    setParams(prev => ({
      ...prev,
      satBands: prev.satBands.filter(b => b.id !== bandId)
    }));
  };

  const handleParamChange = (paramId: string, value: string) => {
    setParams(prev => {
      const newParams = { ...prev };
      switch (paramId) {
        case 'tr': newParams.tr = parseInt(value) || 4000; break;
        case 'te': newParams.te = parseInt(value) || 100; break;
        case 'fovRead': 
          newParams.fovRead = parseInt(value) || 220;
          // Sincronizar FOV con parametro
          setFovBox(prev => ({ ...prev, size: { ...prev.size, read: newParams.fovRead } }));
          break;
        case 'flipAngle': newParams.flipAngle = parseInt(value) || 150; break;
        case 'averages': newParams.averages = Math.max(1, Math.min(6, parseInt(value) || 2)); break;
        case 'fatSuppression': newParams.fatSuppression = value as 'None' | 'FatSat' | 'STIR'; break;
        case 'baseResolution': newParams.baseResolution = parseInt(value) || 320; break;
        case 'phaseResolution': newParams.phaseResolution = parseFloat(value) || 100; break;
        case 'phasePartialFourier': newParams.phasePartialFourier = value as 'Off' | '7/8' | '6/8'; break;
        case 'phaseEncodingDir': newParams.phaseEncodingDir = value as 'R >> L' | 'A >> P'; break;
        case 'phaseOversampling': newParams.phaseOversampling = parseFloat(value) || 0; break;
        case 'concatenations': newParams.concatenations = Math.max(1, Math.min(3, parseInt(value) || 1)); break;
        case 'gradientMode': newParams.gradientMode = value as 'Normal' | 'Whisper' | 'Performance'; break;
        case 'multibandFactor': newParams.multibandFactor = parseInt(value) || 1; break;
        case 'sliceThickness': newParams.sliceThickness = parseFloat(value) || 3.0; break;
        case 'slices': newParams.slices = parseInt(value) || 24; break;
        case 'sliceGroup': newParams.sliceGroup = parseInt(value) || 1; break;
        case 'distanceFactor': newParams.distanceFactor = parseFloat(value) || 10; break;
        case 'orientation': newParams.orientation = value as 'Axial' | 'Sagittal' | 'Coronal'; break;
        case 'fovPhase': newParams.fovPhase = parseFloat(value) || 81; break;
        case 'bValue': 
          newParams.bValue = parseInt(value) || 0;
          break;
        case 'clinicalCase':
          if (value === 'Acute Stroke') {
            newParams.hasInfarct = true;
            newParams.infarctLocation = { x: 140, y: 100, radius: 18 };
          } else if (value === 'MS Lesions') {
            newParams.hasInfarct = true;
            newParams.infarctLocation = { x: 100, y: 70, radius: 8 };
          } else {
            newParams.hasInfarct = false;
            newParams.infarctLocation = undefined;
          }
          break;
        case 'wc':
          newParams.wc = parseInt(value) || 128;
          break;
        case 'ww':
          newParams.ww = parseInt(value) || 256;
          break;
      }
      return newParams;
    });
  };

  const getCurrentParamGroups = (): ParameterGroup[] => {
    const groups = parameterGroups[activeTab] || [];
    return groups.map(group => ({
      ...group,
      parameters: group.parameters.map(p => {
        let value = '';
        switch (p.id) {
          case 'tr': value = String(params.tr); break;
          case 'te': value = String(params.te); break;
          case 'fovRead': value = String(params.fovRead); break;
          case 'flipAngle': value = String(params.flipAngle); break;
          case 'averages': value = String(params.averages); break;
          case 'fatSuppression': value = params.fatSuppression; break;
          case 'baseResolution': value = String(params.baseResolution); break;
          case 'phaseResolution': value = String(params.phaseResolution); break;
          case 'phasePartialFourier': value = params.phasePartialFourier; break;
          case 'phaseEncodingDir': value = params.phaseEncodingDir; break;
          case 'phaseOversampling': value = String(params.phaseOversampling); break;
          case 'concatenations': value = String(params.concatenations); break;
          case 'gradientMode': value = params.gradientMode; break;
          case 'multibandFactor': value = String(params.multibandFactor); break;
          case 'sliceThickness': value = String(params.sliceThickness); break;
          case 'slices': value = String(params.slices); break;
          case 'sliceGroup': value = String(params.sliceGroup); break;
          case 'distanceFactor': value = String(params.distanceFactor); break;
          case 'orientation': value = params.orientation; break;
          case 'fovPhase': value = String(params.fovPhase); break;
          case 'sequenceName': value = params.sequenceName; break;
          case 'wc': value = String(params.wc); break;
          case 'ww': value = String(params.ww); break;
          default: value = p.value;
        }
        return { ...p, value };
      }),
    }));
  };

  const handleFOVChange = (newFOV: FOVBox) => {
    setFovBox(newFOV);
    
    // Sync params from FOV size
    const newSlices = Math.max(1, Math.min(60, Math.round(newFOV.size.depth / params.sliceThickness)));
    const newFov = Math.max(140, Math.min(400, Math.round(newFOV.size.read)));
    
    if (newSlices !== params.slices || newFov !== params.fovRead) {
      setParams(prev => ({
        ...prev,
        slices: newSlices,
        fovRead: newFov
      }));
    }
  };

  const handleSaveExam = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = {
        paciente_id: patientData?.patient?.id || 1,
        protocolo_id: selectedProtocolId,
        params: [{
          tr: params.tr,
          te: params.te,
          ti: 0,
          fov_read: params.fovRead,
          fov_phase: params.fovPhase,
          slice_thickness: params.sliceThickness,
          slice_gap: params.distanceFactor,
          flip_angle: params.flipAngle,
          matrix_size: params.baseResolution,
          nex: params.averages,
          phase_encoding: params.phaseEncodingDir,
          fat_sat: params.fatSuppression === 'FatSat',
          orientation: params.orientation.toUpperCase(),
        }],
      };
      const response = await fetch(`${API_BASE}/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('mri_token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.error) {
          setSaveMessage(`Error: ${result.error}`);
        } else {
          setSaveMessage(`✓ Exam saved! (ID: ${result.id})`);
        }
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch {
      setSaveMessage('Server not running');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-black text-gray-300 items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-gray-300 overflow-hidden">
      <aside className="w-80 flex flex-col border-r border-slate-700 overflow-hidden">
        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase">Protocol</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  Swal.fire({
                    title: '¿Cancelar examen?',
                    text: 'Perderás todo el progreso actual.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Sí, cancelar',
                    cancelButtonText: 'No, continuar',
                  }).then((result) => {
                    if (result.isConfirmed) {
                      navigate('/');
                    }
                  });
                }}
                className="text-xs text-red-500 hover:text-red-400"
              >
                ✕ Cancelar
              </button>
              <button
                onClick={() => navigate('/admin', { state: { from: '/console', protocolId: selectedProtocolId } })}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                ⚙
              </button>
            </div>
          </div>
          <div className="relative">
            <select
              value={selectedProtocolId || ''}
              onChange={(e) => handleProtocolChange(parseInt(e.target.value))}
              className="w-full h-8 bg-[#232323] border border-slate-700 px-2 text-xs text-white appearance-none cursor-pointer"
            >
              {protocols.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.nombre.length > 35 ? protocol.nombre.substring(0, 35) + '...' : protocol.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          {selectedProtocolId && (
            <div className="px-1 py-1 text-xs text-yellow-400 truncate">
              {protocols.find(p => p.id === selectedProtocolId)?.nombre || 'No protocol selected'}
            </div>
          )}
        </div>

        <div className="p-3 bg-[#1a1a1a] border-b border-slate-700 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="text-xs text-gray-500 uppercase mb-2 shrink-0">Sequence List ({sequences.length})</div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <SequenceList
              sequences={sequences}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSequenceSelect={handleSequenceSelect}
              onReorder={handleReorder}
              onOpen={handleOpenSequence}
              onRepeat={handleRepeatSequence}
              onDelete={handleDeleteSequence}
              onCopyAndGo={handleCopyAndGo}
            />
          </div>
        </div>

        {patientData?.patient && (
          <div className="p-2 border-b border-slate-700 bg-[#1a1a1a] text-xs shrink-0">
            <div className="text-gray-400">Patient: {patientData.patient.lastName}</div>
            <div className="text-gray-500">ID: {patientData.patient.patientId}</div>
            <div className="text-gray-500">Protocol: {patientData.protocol}</div>
          </div>
        )}

        <div className="p-3 border-b border-slate-700 space-y-2 shrink-0">
          {isRunning && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Acquisition</span>
                <span className="text-yellow-400">{acquiredSlices}/{totalSlices} slices ({scanProgress}%)</span>
              </div>
              <div className="h-2 bg-[#1a1a1a] rounded overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="flex gap-2 mt-2">
                {scanActive ? (
                  <>
                    <button
                      onClick={handleFastForward}
                      disabled={acquiredSlices >= totalSlices}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded"
                    >
                      <span>⏩ Skip</span>
                    </button>
                    <button
                      onClick={handleStopScan}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                    >
                      <span>⏹ Stop</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartScan}
                    className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                  >
                    <span>▶ Start Scan</span>
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleSaveExam}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-sm font-medium rounded"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Exam</span>
          </button>
          {saveMessage && <div className={`mt-2 text-xs ${saveMessage.includes('success') ? 'text-green-400' : 'text-yellow-400'}`}>{saveMessage}</div>}
        </div>

        <div className="mt-auto p-3 border-t border-slate-700 shrink-0">
          <ControlButtons
            onDelete={handleDeleteSequence}
            onSkip={handleSkipSequence}
            onStop={handleStopSequence}
            onPause={handlePauseSequence}
            onContinue={handleContinueSequence}
            onCopyGo={handleCopyGo}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 p-0.5">
          <ViewportGrid 
            params={params} 
            fovBox={fovBox}
            onFOVChange={handleFOVChange}
          />
        </div>

        <div className="shrink-0 border-t border-slate-700 bg-[#1a1a1a] overflow-auto">
          <ParamTabs tabs={paramTabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <ParamForm 
            groups={getCurrentParamGroups()} 
            onParamChange={handleParamChange} 
            activeTab={activeTab}
            satBands={params.satBands}
            onAddSatBand={addSatBand}
            onUpdateSatBand={updateSatBand}
            onRemoveSatBand={removeSatBand}
          />
        </div>
      </main>
    </div>
  );
}