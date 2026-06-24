import { useState, useCallback, useEffect, useRef } from 'react';
import { type Box, type VolumeBox, type ViewerParams, generateAtlasData, applySequenceFilter, detectSequenceType } from './Viewer';

const CANVAS_SIZE = 256;
const VISUAL_SPACING_FACTOR = 2.5; // Factor para separar líneas de slices
const VOLUME_SCALE = 1.2; // Factor de conversión mm → píxeles

// Función de proyección 3D: calcula dimensiones visuales según orientación del viewport
function getProjectedDimensions(
  volume: VolumeBox,
  viewportOrientation: 'Axial' | 'Coronal' | 'Sagittal',
  sequenceOrientation: 'Axial' | 'Coronal' | 'Sagittal'
): { w: number; h: number; showSlices: boolean; sliceLines: number } {
  const isAcquisitionPlane = viewportOrientation === sequenceOrientation;
  
  if (isAcquisitionPlane) {
    // En el plano de adquisición (ej: Axial para secuencia Axial):
    // w = FOV Read (R-L), h = FOV Phase (A-P)
    // NO hay líneas de slices (están hacia el fondo del volumen)
    return {
      w: volume.fovRead * VOLUME_SCALE,
      h: volume.fovPhase * VOLUME_SCALE,
      showSlices: false,
      sliceLines: 0
    };
  } else {
    // En planos perpendiculares (Coronal/Sagittal para secuencia Axial):
    // w = FOV del plano, h = Coverage (donde se ven los slices horizontales)
    const fovInPlane = viewportOrientation === 'Coronal' 
      ? volume.fovRead 
      : volume.fovPhase;
    
    // Calcular slices visuales basado en coverage
    const sliceThickness = 3; // valor por defecto
    const gapFactor = 0.1; // 10% gap
    const sliceTotal = sliceThickness * (1 + gapFactor);
    const sliceLines = Math.max(1, Math.round(volume.coverage / sliceTotal));
    
    return {
      w: fovInPlane * VOLUME_SCALE,
      h: volume.coverage * VOLUME_SCALE,
      showSlices: true,
      sliceLines: Math.min(60, sliceLines)
    };
  }
}



interface ViewerSingleProps {
  title: string;
  orientation: 'Axial' | 'Coronal' | 'Sagittal';
  params: ViewerParams;
  box: Box;
  volume?: VolumeBox; // Nuevo: volumen 3D del Slice Package
  onBoxChange: (box: Box) => void;
  onVolumeChange?: (volume: VolumeBox) => void;
}

function ViewerSingle({ 
  title, 
  orientation, 
  params, 
  box, 
  volume,
  onBoxChange
}: ViewerSingleProps) {
  const sequenceOrientation = params.orientation || 'Axial';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0 });
  const [rotationStart, setRotationStart] = useState({ mouseAngle: 0, boxRotation: 0, isocenterX: 0, isocenterY: 0 });
  const [scaleStart, setScaleStart] = useState({ mouseY: 0, boxH: 0, boxY: 0 });

  // === CORRECCIÓN 1: Usar orientación NATIVA del viewport, NO activeOrientation ===
  const atlasData = generateAtlasData(CANVAS_SIZE, CANVAS_SIZE, orientation);
  const sequenceType = detectSequenceType(params);
  
  // Renderizar imagen según filtros de secuencia
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const filteredPixels = applySequenceFilter(
      atlasData,
      sequenceType,
      params.fatSuppression,
      params.baseResolution,
      params.averages,
      {
        bValue: params.bValue || 0,
        hasInfarct: params.hasInfarct || false,
        infarctLocation: params.infarctLocation
      },
      params.satBands || [],
      box.x,
      box.y,
      box.w,
      box.h,
      rotation
    );

    const imgData = new ImageData(new Uint8ClampedArray(filteredPixels), CANVAS_SIZE, CANVAS_SIZE);
    ctx.putImageData(imgData, 0, 0);
  }, [atlasData, sequenceType, params, box, rotation]);

  // === CÁLCULO DE SLICES VISUALES CON ESPACIADO MÍNIMO GARANTIZADO ===
  const sliceThickness = params.sliceThickness || 3;
  const gapPercentage = params.distanceFactor || 10;
  
  // Grosor visual mínimo de 3px por línea para que sea clickeable
  const MIN_SLICE_VISUAL = 3;
  
  // Calcular con factor multiplicador para separación nítida
  const rawVisualThickness = sliceThickness * 1.5;
  const visualSliceThickness = Math.max(MIN_SLICE_VISUAL, Math.min(15, rawVisualThickness * VISUAL_SPACING_FACTOR * 0.4));
  
  // Gap visual con mínimo garantizado
  const rawGap = (gapPercentage / 100) * sliceThickness;
  const MIN_GAP_VISUAL = 2;
  const visualGap = Math.max(MIN_GAP_VISUAL, Math.min(20, rawGap * VISUAL_SPACING_FACTOR * 0.5));
  const sliceTotalHeight = visualSliceThickness + visualGap;
  
  let calculatedSlices = Math.max(1, Math.min(60, Math.floor(box.h / sliceTotalHeight)));
  let showSliceLines = true;
  
  // Si hay volumen 3D, usar proyecciones
  if (volume) {
    const projected = getProjectedDimensions(volume, orientation, sequenceOrientation);
    calculatedSlices = projected.sliceLines;
    showSliceLines = projected.showSlices;
  }
  
  const sliceLines = Array.from({ length: calculatedSlices });

  // === CORRECCIÓN 2: Calcular isocentro para transformaciones ===
  const isocenterX = box.x + box.w / 2;
  const isocenterY = box.y + box.h / 2;

  // Calcular rotación de flecha de fase
  const phaseArrowRotation = params.phaseEncodingDir.includes('R >> L') ? 0 :
                             params.phaseEncodingDir.includes('L >> R') ? 180 :
                             params.phaseEncodingDir.includes('A >> P') ? 90 :
                             params.phaseEncodingDir.includes('P >> A') ? 270 : 0;

  // El bloque SIEMPRE es interactivo (para pruebas)
  const shouldShowInteractiveBlock = true;

  // === CORRECCIÓN 2: Handlers basados en isocentro ===
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!shouldShowInteractiveBlock) return;
    if (isRotating || isScaling) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDragStart({ x: mouseX, y: mouseY, boxX: box.x, boxY: box.y });
  }, [box, isRotating, isScaling, shouldShowInteractiveBlock]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!isDragging && !isRotating && !isScaling) return;

    // === MODO DRAG: Mover directamente a la posición del mouse ===
    if (isDragging && shouldShowInteractiveBlock) {
      // Sin límites - dejar que el usuario mueva libremente
      onBoxChange({ ...box, x: x - box.w / 2, y: y - box.h / 2 });
    }

    // === MODO ROTATE: Rotar alrededor del isocentro ===
    if (isRotating && shouldShowInteractiveBlock) {
      const mouseAngle = Math.atan2(y - rotationStart.isocenterY, x - rotationStart.isocenterX) * (180 / Math.PI);
      const newRotation = rotationStart.boxRotation + (mouseAngle - rotationStart.mouseAngle);
      setRotation(newRotation);
    }

    // === MODO SCALE: Escalar altura con crecimiento simétrico ===
    if (isScaling && shouldShowInteractiveBlock) {
      const currentIsocenterY = box.y + box.h / 2;
      const mouseDeltaY = y - scaleStart.mouseY;
      
      // Nueva altura
      let newH = scaleStart.boxH + mouseDeltaY;
      newH = Math.max(40, Math.min(220, newH));
      
      // Mantener isocentro centrado mientras crece
      const newIsocenterY = currentIsocenterY;
      let newY = newIsocenterY - newH / 2;
      
      // Limitar solo para que no salga completamente del canvas
      newY = Math.max(5, Math.min(CANVAS_SIZE - newH - 5, newY));
      
      onBoxChange({ ...box, h: newH, y: newY });
    }
  }, [isDragging, isRotating, isScaling, dragStart, box, onBoxChange, rotationStart, scaleStart, shouldShowInteractiveBlock]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsRotating(false);
    setIsScaling(false);
  }, []);

  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    if (!shouldShowInteractiveBlock) return;
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const mouseAngle = Math.atan2(mouseY - isocenterY, mouseX - isocenterX) * (180 / Math.PI);
    setRotationStart({ mouseAngle, boxRotation: rotation, isocenterX, isocenterY });
  }, [isocenterX, isocenterY, rotation, shouldShowInteractiveBlock]);

  const handleScaleStart = useCallback((e: React.MouseEvent) => {
    if (!shouldShowInteractiveBlock) return;
    e.stopPropagation();
    e.preventDefault();
    setIsScaling(true);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setScaleStart({ mouseY: e.clientY - rect.top, boxH: box.h, boxY: box.y });
  }, [box, shouldShowInteractiveBlock]);

  // === Marks anatómicas según orientación nativa ===
  const getMarks = () => {
    switch (orientation) {
      case 'Axial':
        return { top: 'A', bottom: 'P', left: 'R', right: 'L' };
      case 'Coronal':
        return { top: 'S', bottom: 'I', left: 'R', right: 'L' };
      case 'Sagittal':
        return { top: 'S', bottom: 'I', left: 'A', right: 'P' };
    }
  };
  const marks = getMarks();

  return (
    <div 
      ref={containerRef} 
      className="relative border border-slate-700 bg-black overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header con orientación nativa */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-[#111] border-b border-slate-700 flex items-center justify-between px-2 text-[9px] z-20">
        <span className="text-yellow-400/80 font-mono">{title}</span>
        <div className="flex gap-2 text-gray-400 font-mono">
          <span>TH: {sliceThickness}mm</span>
          <span>Gap: {gapPercentage}%</span>
          <span className="text-yellow-400">Slices: {calculatedSlices}</span>
        </div>
      </div>

      {/* Canvas - renderiza según orientación nativa del viewport */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-full h-full block pointer-events-none"
      />

      {/* Marks anatómicas según orientación nativa */}
      <div className="absolute top-7 left-2 text-[10px] text-yellow-400 font-bold">
        {orientation === 'Axial' ? 'AX' : orientation === 'Coronal' ? 'COR' : 'SAG'}
      </div>
      <div className="absolute top-1/2 left-1 text-[9px] text-yellow-400 font-bold">{marks.left}</div>
      <div className="absolute top-1/2 right-1 text-[9px] text-yellow-400 font-bold">{marks.right}</div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-yellow-400 font-bold">{marks.bottom}</div>

      {/* === CORRECCIÓN 2: Bloque amarillo con transformación basada en isocentro === */}
      {shouldShowInteractiveBlock ? (
        <div
          className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/5 cursor-move z-30"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: box.w,
            height: box.h,
            transform: `translate(${box.x + box.w/2}px, ${box.y + box.h/2}px) translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            pointerEvents: 'auto',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Manejador rotate */}
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full cursor-pointer hover:bg-yellow-300 z-20"
            title="Rotate"
            onMouseDown={handleRotateStart}
          />
          
          {/* Manejador scale */}
          <div
            className="absolute -bottom-3 -right-3 w-4 h-4 bg-yellow-400 cursor-se-resize hover:bg-yellow-300 z-20"
            title="Scale"
            onMouseDown={handleScaleStart}
          />
          
          {/* Líneas de slices - solo mostrar si showSliceLines es true */}
          {showSliceLines && (
            <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden p-0.5">
              {sliceLines.map((_, i) => (
                <div
                  key={i}
                  className="w-full bg-yellow-400/95"
                  style={{
                    height: visualSliceThickness,
                    marginBottom: i < sliceLines.length - 1 ? visualGap : 0,
                    minHeight: '1px',
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Isocentro */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 border-2 border-yellow-400 bg-black rounded-full pointer-events-none z-10" />
          
          {/* Flecha phase encoding */}
          <div className="absolute -bottom-6 right-2 flex items-center gap-1 pointer-events-none">
            <span className="text-yellow-400 text-[10px] font-bold">
              {params.phaseEncodingDir.split('>>')[0].trim()}
            </span>
            <div 
              className="w-6 h-0.5 bg-yellow-400 relative"
              style={{ transform: `rotate(${phaseArrowRotation}deg)`, transformOrigin: 'left center' }}
            >
              <div className="absolute right-0 -top-1.5 border-y-2.5 border-l-4 border-transparent border-yellow-400" />
            </div>
          </div>
        </div>
      ) : (
        // Viewport activo: visor de resultado (no interactivo)
        <div
          className="absolute border-2 border-yellow-600 bg-yellow-600/5 pointer-events-none"
          style={{
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-yellow-600 bg-black rounded-full" />
        </div>
      )}

      {/* Saturation Bands */}
      {params.satBands?.filter(b => b.enabled).map((band, idx) => {
        const bandCenterX = isocenterX + band.x;
        const bandCenterY = isocenterY + band.y;
        return (
          <div
            key={`sat-${idx}`}
            className="absolute border border-cyan-400 bg-cyan-400/10 pointer-events-none"
            style={{
              left: bandCenterX - band.width / 2,
              top: bandCenterY - band.thickness / 2,
              width: band.width,
              height: band.thickness,
              transform: `rotate(${band.angle}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <div className="absolute top-1 left-2 text-[8px] text-cyan-400 font-bold">SAT</div>
          </div>
        );
      })}

      {/* Info footer */}
      <div className="absolute bottom-1 right-1 text-[8px] text-white/40 font-mono">
        ISO: {Math.round(isocenterX)},{Math.round(isocenterY)} | {Math.round(box.w)}x{Math.round(box.h)} | {Math.round(rotation)}°
      </div>
    </div>
  );
}

interface ViewerGridProps {
  params: ViewerParams;
  box: Box;
  volume?: VolumeBox;
  onBoxChange: (box: Box) => void;
}

export function ViewerGrid({ params, box, volume, onBoxChange }: ViewerGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1 h-full">
      <ViewerSingle
        title="AXIAL"
        orientation="Axial"
        params={params}
        box={box}
        volume={volume}
        onBoxChange={onBoxChange}
      />
      <ViewerSingle
        title="CORONAL"
        orientation="Coronal"
        params={params}
        box={box}
        volume={volume}
        onBoxChange={onBoxChange}
      />
      <ViewerSingle
        title="SAGITTAL"
        orientation="Sagittal"
        params={params}
        box={box}
        volume={volume}
        onBoxChange={onBoxChange}
      />
    </div>
  );
}