import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { GripVertical, AlertTriangle, Play, Copy, Trash2, RotateCcw } from 'lucide-react';
import type { Sequence } from '../../data/mockData';

interface SequenceListProps {
  sequences: Sequence[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onSequenceSelect?: (sequence: Sequence) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onOpen?: (id: number) => void;
  onRepeat?: (id: number) => void;
  onDelete?: (id: number) => void;
  onCopyAndGo?: (id: number) => void;
}

export function SequenceList({ 
  sequences, 
  selectedId, 
  onSelect, 
  onSequenceSelect, 
  onReorder,
  onOpen,
  onRepeat,
  onDelete,
  onCopyAndGo
}: SequenceListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; seqId: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = (seq: Sequence) => {
    if (draggedIndex !== null) return;
    onSelect(seq.id);
    if (onSequenceSelect) {
      onSequenceSelect(seq);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, seq: Sequence) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, seqId: seq.id });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDraggedOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && onReorder && draggedIndex !== toIndex) {
      onReorder(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  let cumulativeTime = 0;
  
  return (
    <div className="flex flex-col gap-1 relative">
      {sequences.map((seq, index) => {
        const isSelected = selectedId === seq.id;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;
        
        const startTime = cumulativeTime;
        cumulativeTime += seq.estimatedTime || 1;
        
        const isAbove = draggedIndex !== null && draggedIndex > index;
        const isBelow = draggedIndex !== null && draggedIndex < index;
        
        return (
          <div
            key={seq.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onContextMenu={(e) => handleContextMenu(e, seq)}
            className={clsx(
              'relative',
              isDragging && 'opacity-50',
              isDragOver && isAbove && 'border-t-2 border-t-yellow-400',
              isDragOver && isBelow && 'border-b-2 border-b-yellow-400'
            )}
          >
            <button
              onClick={() => handleClick(seq)}
              className={clsx(
                'w-full flex flex-col gap-1 px-2 py-2 text-left text-xs font-mono transition-colors rounded',
                isSelected && 'bg-emerald-600 text-white',
                !isSelected && seq.status === 'running' && 'bg-emerald-800/50 text-white',
                !isSelected && seq.status !== 'running' && 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]',
                isDragging && 'cursor-grabbing'
              )}
            >
              <div className="flex items-center gap-1">
                <GripVertical className="w-3 h-3 text-gray-600 hover:text-gray-400 cursor-grab flex-shrink-0" />
                <span className="w-5 text-gray-500">{index + 1}</span>
                <span className="flex-1 truncate">{seq.name}</span>
                
                {/* Icono de Setup (Trabajador) */}
                {seq.requiresSetup && (
                  <div className="flex-shrink-0" title={seq.setupReason}>
                    <AlertTriangle className="w-3 h-3 text-orange-400 animate-pulse" />
                  </div>
                )}
                
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    isSelected && 'bg-white',
                    !isSelected && seq.status === 'running' && 'bg-yellow-300 animate-pulse',
                    !isSelected && seq.status === 'ready' && 'bg-green-400',
                    !isSelected && seq.status === 'completed' && 'bg-blue-400',
                    !isSelected && (seq.status === 'idle') && 'bg-gray-500'
                  )}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  {seq.plane && <span className="text-orange-400">{seq.plane}</span>}
                  {seq.slice_thickness && <span>{seq.slice_thickness}mm</span>}
                  {seq.estimatedTime && (
                    <span className="text-blue-400">{seq.estimatedTime}m</span>
                  )}
                </div>
                <span className="text-gray-500">
                  {seq.estimatedTime ? `${startTime}-${startTime + seq.estimatedTime}m` : '--'}
                </span>
              </div>
            </button>
          </div>
        );
      })}

      {/* Menú Contextual */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-[#2a2a2a] border border-slate-600 rounded shadow-lg py-1 z-50 min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { onOpen?.(contextMenu.seqId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2"
          >
            <Play className="w-3 h-3" /> Open / Editar
          </button>
          <button
            onClick={() => { onRepeat?.(contextMenu.seqId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2"
          >
            <RotateCcw className="w-3 h-3" /> Repeat
          </button>
          <button
            onClick={() => { onCopyAndGo?.(contextMenu.seqId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-orange-400 hover:bg-[#3a3a3a] flex items-center gap-2"
          >
            <Copy className="w-3 h-3" /> Copy & Go
          </button>
          <div className="border-t border-slate-600 my-1" />
          <button
            onClick={() => { onDelete?.(contextMenu.seqId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-[#3a3a3a] flex items-center gap-2"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}