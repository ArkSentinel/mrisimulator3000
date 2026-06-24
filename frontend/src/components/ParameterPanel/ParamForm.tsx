import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import type { ParameterGroup, SatBand } from '../../data/mockData';

interface ParamFormProps {
  groups: ParameterGroup[];
  onParamChange?: (paramId: string, value: string) => void;
  activeTab: string;
  satBands?: SatBand[];
  onAddSatBand?: () => void;
  onUpdateSatBand?: (bandId: string, updates: Partial<SatBand>) => void;
  onRemoveSatBand?: (bandId: string) => void;
}

const getStep = (paramId: string): number => {
  const steps: Record<string, number> = {
    tr: 50,
    te: 5,
    fovRead: 10,
    fovPhase: 1,
    sliceThickness: 0.5,
    distanceFactor: 1,
    slices: 1,
    sliceGroup: 1,
    flipAngle: 10,
    averages: 1,
    phaseResolution: 5,
    phaseOversampling: 5,
    concatenations: 1,
    multibandFactor: 1,
  };
  return steps[paramId] || 10;
};

export function ParamForm({ 
  groups, 
  onParamChange, 
  activeTab,
  satBands = [],
  onAddSatBand,
  onUpdateSatBand,
  onRemoveSatBand
}: ParamFormProps) {
  const handleNumericChange = (paramId: string, delta: number) => {
    if (!onParamChange) return;
    
    const currentValue = parseFloat(
      groups.flatMap(g => g.parameters).find(p => p.id === paramId)?.value || '0'
    );
    const step = getStep(paramId);
    const newValue = currentValue + (delta * step);
    onParamChange(paramId, String(newValue));
  };

  const handleSelectChange = (paramId: string, value: string) => {
    if (!onParamChange) return;
    onParamChange(paramId, value);
  };

  const isSelectParam = (param: { type?: string; options?: string[] }) => {
    return param.type === 'select' && param.options && param.options.length > 0;
  };

  const isButtonParam = (param: { type?: string }) => {
    return param.type === 'button';
  };

  if (activeTab === 'satbands') {
    return (
      <div className="p-4 overflow-y-auto max-h-48 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Saturation Bands</span>
          <button
            onClick={onAddSatBand}
            className="flex items-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded"
          >
            <Plus className="w-3 h-3" /> Add Band
          </button>
        </div>
        
        {satBands.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-4">
            No saturation bands added. Click "Add Band" to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {satBands.map((band, idx) => (
              <div key={band.id} className="bg-[#232323] border border-cyan-800 rounded p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400 font-medium">Band {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateSatBand?.(band.id, { enabled: !band.enabled })}
                      className={`text-xs px-2 py-0.5 rounded ${band.enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                    >
                      {band.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => onRemoveSatBand?.(band.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Pos Y:</span>
                    <input
                      type="number"
                      value={band.y}
                      onChange={(e) => onUpdateSatBand?.(band.id, { y: parseFloat(e.target.value) || 0 })}
                      className="w-12 h-5 bg-[#1a1a1a] text-gray-300 border border-slate-700 rounded px-1"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Thick:</span>
                    <input
                      type="number"
                      value={band.thickness}
                      onChange={(e) => onUpdateSatBand?.(band.id, { thickness: parseFloat(e.target.value) || 20 })}
                      className="w-12 h-5 bg-[#1a1a1a] text-gray-300 border border-slate-700 rounded px-1"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Angle:</span>
                    <input
                      type="number"
                      value={band.angle}
                      onChange={(e) => onUpdateSatBand?.(band.id, { angle: parseFloat(e.target.value) || 0 })}
                      className="w-12 h-5 bg-[#1a1a1a] text-gray-300 border border-slate-700 rounded px-1"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Width:</span>
                    <input
                      type="number"
                      value={band.width}
                      onChange={(e) => onUpdateSatBand?.(band.id, { width: parseFloat(e.target.value) || 256 })}
                      className="w-12 h-5 bg-[#1a1a1a] text-gray-300 border border-slate-700 rounded px-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 overflow-y-auto max-h-48">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider border-b border-slate-700 pb-1">
            {group.label}
          </div>
          {group.parameters.map((param) => {
            const isSelect = isSelectParam(param);
            const isButton = isButtonParam(param);
            
            if (isButton && param.id === 'addSatBand') {
              return null;
            }
            
            return (
              <div key={param.id} className="flex items-center gap-2">
                <label className="w-20 text-xs text-gray-400">{param.label}</label>
                <div className="flex items-center gap-1 flex-1">
                  {isSelect ? (
                    <select
                      value={param.value}
                      onChange={(e) => handleSelectChange(param.id, e.target.value)}
                      className="w-20 h-6 text-xs font-mono bg-[#232323] text-gray-300 border border-slate-700 rounded focus:outline-none"
                    >
                      {param.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : activeTab === 'sequence' ? (
                    <input
                      type="text"
                      value={param.value}
                      readOnly
                      className="w-24 h-6 text-xs font-mono bg-[#1a1a1a] text-gray-400 border border-slate-700 rounded px-2"
                    />
                  ) : (
                    <>
                      <button 
                        className="flex items-center justify-center w-5 h-6 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-l border border-slate-700"
                        onClick={() => handleNumericChange(param.id, -1)}
                      >
                        <ChevronUp className="w-3 h-3 text-gray-400" />
                      </button>
                      <input
                        type="text"
                        value={param.value}
                        readOnly
                        className="w-16 h-6 text-center text-xs font-mono bg-[#232323] text-gray-300 border-y border-slate-700 focus:outline-none"
                      />
                      <button 
                        className="flex items-center justify-center w-5 h-6 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-r border border-slate-700"
                        onClick={() => handleNumericChange(param.id, 1)}
                      >
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                    </>
                  )}
                  {param.unit && (
                    <span className="text-xs text-gray-500 ml-1">{param.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}