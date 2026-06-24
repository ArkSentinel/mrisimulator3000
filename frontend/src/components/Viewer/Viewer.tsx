import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { ViewerData, SatBand } from '../../data/mockData';

function isPixelInSatBand(x: number, y: number, band: SatBand, boxX: number, boxY: number, boxW: number, boxH: number, _rotation: number): boolean {
  if (!band.enabled) return false;
  
  const isocenterX = boxX + boxW / 2;
  const isocenterY = boxY + boxH / 2;
  
  const bandCenterX = isocenterX + band.x;
  const bandCenterY = isocenterY + band.y;
  
  const dx = x - bandCenterX;
  const dy = y - bandCenterY;
  
  const angleRad = -band.angle * Math.PI / 180;
  const rotatedX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
  const rotatedY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
  
  const halfWidth = band.width / 2;
  const halfThickness = band.thickness / 2;
  
  return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfThickness;
}

function applySatBandEffect(
  pixels: Uint8ClampedArray,
  width: number,
  _height: number,
  satBands: SatBand[],
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  rotation: number
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);
    
    for (const band of satBands) {
      if (isPixelInSatBand(x, y, band, boxX, boxY, boxW, boxH, rotation)) {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        break;
      }
    }
  }
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// VolumeBox representa el volumen 3D del Slice Package en mm
export interface VolumeBox {
  fovRead: number;      // Ancho (eje X del plano de adquisición) en mm
  fovPhase: number;     // Profundidad (eje Y del plano de adquisición) en mm
  coverage: number;      // Cobertura total (eje Z perpendicular) en mm
  isocenterX: number;    // Posición X del isocentro en píxeles
  isocenterY: number;    // Posición Y del isocentro en píxeles
  rotation: number;      // Rotación en grados
}

export interface ViewerParams {
  tr: number;
  te: number;
  flipAngle: number;
  averages: number;
  fatSuppression: 'None' | 'FatSat' | 'STIR';
  fovRead: number;
  fovPhase: number;
  sliceThickness: number;
  slices: number;
  distanceFactor: number;
  baseResolution: number;
  phaseResolution: number;
  phasePartialFourier: string;
  phaseEncodingDir: string;
  orientation: 'Axial' | 'Sagittal' | 'Coronal';
  sequenceName: string;
  // DWI parameters
  bValue?: number;
  hasInfarct?: boolean;
  infarctLocation?: { x: number; y: number; radius: number };
  // Saturation Bands
  satBands: SatBand[];
}

interface ViewerProps {
  data: ViewerData;
  params: ViewerParams;
  initialBox?: Box;
  onBoxChange: (box: Box) => void;
  isActive?: boolean;
  externalIsocenter?: { x: number; y: number } | null;
}

const CANVAS_SIZE = 256;

type SequenceType = 'T1' | 'T2' | 'FLAIR' | 'PD' | 'DWI';

export function detectSequenceType(params: ViewerParams): SequenceType {
  const name = (params.sequenceName || '').toUpperCase();
  const hasDWI = name.includes('DWI') || name.includes('DIFFUSION') || name.includes('EPI') || 
                 name.includes('TRACE') || params.bValue !== undefined;
  
  if (hasDWI || params.baseResolution < 128) return 'DWI';
  if (params.tr < 800 && params.te < 30) return 'T1';
  if (params.tr > 7000 && params.te > 80) return 'FLAIR';
  if (params.tr > 3000 && params.te > 80) return 'T2';
  return 'PD';
}

export function generateAtlasData(width: number, height: number, orientation: 'Axial' | 'Sagittal' | 'Coronal' = 'Axial'): Uint8Array {
  const data = new Uint8Array(width * height);
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dx = x - centerX;
      const dy = y - centerY;
      
      // Diferente forma según orientación
      let dist: number;
      if (orientation === 'Sagittal') {
        // Vista lateral: cerebro más elongado horizontalmente
        dist = Math.sqrt((dx / 1.3) ** 2 + dy ** 2);
      } else if (orientation === 'Coronal') {
        // Vista frontal: cerebro más ancho
        dist = Math.sqrt((dx / 0.9) ** 2 + (dy / 1.1) ** 2);
      } else {
        // Axial: vista desde arriba (circular)
        dist = Math.sqrt(dx * dx + dy * dy);
      }
      
      // Cerebro externo - cuero cabelludo
      if (dist < 100) {
        // Hueso (oscuro)
        if (dist > 85) {
          data[idx] = 10;
        } else {
          // Cerebro - generar forma realista según orientación
          const brainShape = getBrainPixelValue(x, y, centerX, centerY, dist, orientation);
          data[idx] = brainShape;
        }
      } else {
        // Aire/fondo
        data[idx] = 0;
      }
    }
  }
  
  return data;
}

function getBrainPixelValue(x: number, y: number, cx: number, cy: number, dist: number, orientation: 'Axial' | 'Sagittal' | 'Coronal' = 'Axial'): number {
  // Ajustar coordenadas relativas según orientación
  let relX: number, relY: number;
  
  if (orientation === 'Sagittal') {
    relX = (x - cx) / 100;  // Más stretch horizontal
    relY = (y - cy) / 65;
  } else if (orientation === 'Coronal') {
    relX = (x - cx) / 90;
    relY = (y - cy) / 70;
  } else {
    relX = (x - cx) / 80;
    relY = (y - cy) / 65;
  }
  
  // Ventrículos laterales - posiciones asimétricas
  const lVentricleX = -0.25;
  const lVentricleY = -0.15;
  const rVentricleX = 0.35;
  const rVentricleY = -0.1;
  const ventricleRadius = 0.12;
  
  const lVentricleDist = Math.sqrt((relX - lVentricleX) ** 2 + (relY - lVentricleY) ** 2);
  const rVentricleDist = Math.sqrt((relX - rVentricleX) ** 2 + (relY - rVentricleY) ** 2);
  
  // Tercer ventriculo
  const thirdVentricleDist = Math.sqrt(relX ** 2 + (relY + 0.15) ** 2);
  
  // Cuarto ventriculo
  const fourthVentricleDist = Math.sqrt(relX ** 2 + (relY - 0.5) ** 2);
  
  // Cuerpo calloso
  const corpusCallosumY = -0.05;
  const corpusCallosumDist = Math.abs(relY - corpusCallosumY);
  const isInCallosum = Math.abs(relX) < 0.35 && corpusCallosumDist < 0.08;
  
  // Sustancia blanca profunda - ganglios basales
  const caudateX = -0.2;
  const caudateY = -0.1;
  const putamenX = -0.25;
  const putamenY = 0.0;
  const thalamusX = -0.05;
  const thalamusY = -0.15;
  const nucleiRadius = 0.12;
  
  const caudateDist = Math.sqrt((relX - caudateX) ** 2 + (relY - caudateY) ** 2);
  const putamenDist = Math.sqrt((relX - putamenX) ** 2 + (relY - putamenY) ** 2);
  const thalamusDist = Math.sqrt((relX - thalamusX) ** 2 + (relY - thalamusY) ** 2);
  
  // Determinar tejido
  let value: number;
  
  // LCR - ventrículos (blanco puro = 250)
  if (lVentricleDist < ventricleRadius || rVentricleDist < ventricleRadius || 
      thirdVentricleDist < 0.06 || fourthVentricleDist < 0.07) {
    value = 250;
  }
  // Cuerpo calloso (sustancia blanca)
  else if (isInCallosum) {
    value = 70 + Math.random() * 15;
  }
  // Ganglios basales (sustancia gris - más oscuros)
  else if (caudateDist < nucleiRadius || putamenDist < nucleiRadius || thalamusDist < nucleiRadius) {
    value = 90 + Math.random() * 20;
  }
  // Sustancia blanca cortical
  else if (dist < 75) {
    value = 55 + Math.random() * 25;
  }
  // Sustancia gris cortical
  else if (dist < 82) {
    value = 100 + Math.random() * 30;
  }
  // Corteza externa
  else {
    value = 110 + Math.random() * 25;
  }
  
  return Math.round(value);
}

function applyT1Filter(pixel: number): number {
  // T1: LCR oscuro, materia blanca clara, materia gris intermedia
  if (pixel > 230) return 30;  // LCR -> negro
  if (pixel > 180) return 60;  // Líquido
  if (pixel > 100) return 180; // Materia blanca -> brillante
  if (pixel > 60) return 120;  // Materia gris
  return 40;                    // Strukturas profundas
}

function applyT2Filter(pixel: number): number {
  // T2: LCR brillante, materia blanca más oscura que gris
  if (pixel > 230) return 255; // LCR -> blanco brillante
  if (pixel > 180) return 220; // Líquido
  if (pixel > 100) return 80;  // Materia blanca -> oscura
  if (pixel > 60) return 140;  // Materia gris
  return 50;
}

function applyFLAIRFilter(pixel: number): number {
  // FLAIR: como T2 pero LCR suprimido (oscuro)
  if (pixel > 230) return 15;  // LCR -> negro (suprimido)
  if (pixel > 180) return 25;  // Líquido -> casi negro
  if (pixel > 100) return 70;  // Materia blanca
  if (pixel > 60) return 130;  // Materia gris
  return 40;
}

function applyPDFilter(pixel: number): number {
  // PD: contraste basado en densidad de protones
  if (pixel > 200) return 180;
  if (pixel > 100) return 100 + (pixel - 100) * 0.8;
  return pixel;
}

export function applySequenceFilter(
  atlasData: Uint8Array,
  sequenceType: SequenceType,
  fatSuppression: string,
  baseResolution: number,
  averages: number,
  dwiParams?: { bValue: number; hasInfarct: boolean; infarctLocation?: { x: number; y: number; radius: number } },
  satBands: SatBand[] = [],
  boxX: number = 0,
  boxY: number = 0,
  boxW: number = 256,
  boxH: number = 256,
  rotation: number = 0
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(atlasData.length * 4);
  const width = 256;
  
  const resolutionFactor = baseResolution < 128 ? 4 : baseResolution < 256 ? 2 : 1;
  const noiseFactor = averages <= 1 ? 25 : averages === 2 ? 15 : 8;
  
  for (let i = 0; i < atlasData.length; i++) {
    const pixel = atlasData[i];
    const x = i % width;
    const y = Math.floor(i / width);
    let value: number;
    
    switch (sequenceType) {
      case 'T1':
        value = applyT1Filter(pixel);
        break;
      case 'FLAIR':
        value = applyFLAIRFilter(pixel);
        break;
      case 'PD':
        value = applyPDFilter(pixel);
        break;
      case 'DWI':
        value = applyDWIFilter(
          pixel, 
          baseResolution, 
          dwiParams?.bValue || 0,
          dwiParams?.hasInfarct || false,
          dwiParams?.infarctLocation,
          x,
          y
        );
        break;
      default:
        value = applyT2Filter(pixel);
    }
    
    // Aplicar supresión de grasa
    if (fatSuppression === 'FatSat' && value > 100 && value < 180) {
      value = Math.max(20, value - 60);
    } else if (fatSuppression === 'STIR' && value > 80) {
      value = Math.max(15, value - 80);
    }
    
    // Agregar ruido gaussiano
    const noise = (Math.random() - 0.5) * noiseFactor;
    value = Math.max(0, Math.min(255, value + noise));
    
    // Aplicar efecto de resolución reducida para baja matrix
    if (resolutionFactor > 1 && Math.random() < 0.3) {
      value = Math.max(0, Math.min(255, value + (Math.random() - 0.5) * 20));
    }
    
    const idx = i * 4;
    pixels[idx] = value;
    pixels[idx + 1] = value;
    pixels[idx + 2] = value;
    pixels[idx + 3] = 255;
  }
  
  if (satBands.length > 0) {
    applySatBandEffect(pixels, 256, 256, satBands, boxX, boxY, boxW, boxH, rotation);
  }
  
  return pixels;
}

function applyDWIFilter(
  pixel: number, 
  baseResolution: number, 
  bValue: number = 0,
  hasInfarct: boolean = false,
  infarctLocation: { x: number; y: number; radius: number } | undefined = undefined,
  x: number = 0,
  y: number = 0
): number {
  const baseNoise = baseResolution < 128 ? 70 : 50;
  const noise = (Math.random() - 0.5) * baseNoise;
  
  let value = pixel;
  
  // Efecto del b-value: mayor b = más restricción, imagen más oscura excepto áreas de infarto
  if (bValue > 0) {
    // Curva exponencial descendente para tejidos normales
    const decay = Math.exp(-bValue / 1500);
    value = value * decay * 0.8;
    
    // Verificar si está en zona de infarto
    if (hasInfarct && infarctLocation) {
      const dx = x - infarctLocation.x;
      const dy = y - infarctLocation.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < infarctLocation.radius) {
        // Área de restricción - BRILLA en DWI de alta b
        const intensityBoost = (bValue / 1000) * 1.5;
        value = Math.min(255, value + 80 + intensityBoost * 50);
      }
    }
  }
  
  // LCR muy oscuro en DWI (agua libre)
  if (pixel > 230) {
    value = 15 + Math.random() * 10;
  }
  
  // Aplicar ruido
  value += noise;
  
  // Distorsión geométrica (artefacto EPI)
  if (bValue > 500) {
    const distortion = Math.sin(y * 0.15) * (bValue / 200);
    value += distortion;
  }
  
  return Math.max(0, Math.min(255, value));
}

const atlasCache = new Map<string, Uint8Array>();

function getAtlasData(orientation: 'Axial' | 'Sagittal' | 'Coronal' = 'Axial'): Uint8Array {
  const cacheKey = `atlas-${CANVAS_SIZE}-${orientation}`;
  if (!atlasCache.has(cacheKey)) {
    atlasCache.set(cacheKey, generateAtlasData(CANVAS_SIZE, CANVAS_SIZE, orientation));
  }
  return atlasCache.get(cacheKey)!;
}

export function Viewer({ data, params, initialBox, onBoxChange, isActive = true, externalIsocenter = null }: ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sliceThickness = params.sliceThickness || 3;
  const gapPercentage = params.distanceFactor || 10;

  const [box, setBox] = useState<Box>(initialBox || { x: 48, y: 64, w: 180, h: 140 });
  
  // Sincronizar con initialBox cuando cambie desde el padre (ej. cuando se cambia desde el panel)
  useEffect(() => {
    if (initialBox) {
      setBox(initialBox);
    }
  }, [initialBox]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0 });
  const [rotation, setRotation] = useState(0);
  const [rotationStart, setRotationStart] = useState({ mouseAngle: 0, boxRotation: 0, isocenterX: 0, isocenterY: 0 });
  const [scaleStart, setScaleStart] = useState({ mouseY: 0, boxH: 0, boxY: 0 });

  const syncBox = useCallback((newBox: Box) => {
    setBox(newBox);
    onBoxChange(newBox);
  }, [onBoxChange]);

  const getIsocenter = useCallback(() => ({
    x: box.x + box.w / 2,
    y: box.y + box.h / 2
  }), [box]);

  const calculateSlices = useCallback((height: number) => {
    const effectiveScale = Math.min(1.2, Math.max(0.8, sliceThickness / 4));
    const vThickness = Math.max(2, Math.min(8, sliceThickness * effectiveScale));
    const minGap = Math.max(1, vThickness * 0.15);
    const vGap = Math.max(minGap, (gapPercentage / 100) * sliceThickness * 0.8);
    const sliceTotalHeight = vThickness + vGap;
    return Math.max(1, Math.min(60, Math.floor(height / sliceTotalHeight)));
  }, [sliceThickness, gapPercentage]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isRotating || isScaling) return;
    e.preventDefault();
    setIsDragging(true);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setDragStart({ x: mouseX, y: mouseY, boxX: box.x, boxY: box.y });
  }, [box, isRotating, isScaling]);

  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    const isocenter = getIsocenter();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const mouseAngle = Math.atan2(mouseY - isocenter.y, mouseX - isocenter.x) * (180 / Math.PI);
    setRotationStart({ mouseAngle, boxRotation: rotation, isocenterX: isocenter.x, isocenterY: isocenter.y });
  }, [box, rotation, getIsocenter]);

  const handleScaleStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsScaling(true);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setScaleStart({ mouseY: e.clientY - rect.top, boxH: box.h, boxY: box.y });
  }, [box]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!isDragging && !isRotating && !isScaling) return;

    if (isDragging) {
      const deltaX = x - dragStart.x;
      const deltaY = y - dragStart.y;
      let newX = dragStart.boxX + deltaX;
      let newY = dragStart.boxY + deltaY;
      const halfW = box.w / 2;
      const halfH = box.h / 2;
      newX = Math.max(-halfW + 10, Math.min(CANVAS_SIZE - halfW - 10, newX));
      newY = Math.max(-halfH + 10, Math.min(CANVAS_SIZE - halfH - 10, newY));
      syncBox({ ...box, x: newX, y: newY });
    }

    if (isRotating) {
      const mouseAngle = Math.atan2(y - rotationStart.isocenterY, x - rotationStart.isocenterX) * (180 / Math.PI);
      const newRotation = rotationStart.boxRotation + (mouseAngle - rotationStart.mouseAngle);
      setRotation(newRotation);
    }

    if (isScaling) {
      const deltaY = y - scaleStart.mouseY;
      const newH = Math.max(40, Math.min(220, scaleStart.boxH + deltaY));
      const halfDelta = (newH - scaleStart.boxH) / 2;
      let newY = scaleStart.boxY - halfDelta;
      const minY = -box.h / 2 + 10;
      const maxY = CANVAS_SIZE - box.h / 2 - 10;
      newY = Math.max(minY, Math.min(maxY, newY));
      syncBox({ ...box, h: newH, y: newY });
    }
  }, [isDragging, isRotating, isScaling, dragStart, box, syncBox, rotationStart, scaleStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsRotating(false);
    setIsScaling(false);
  }, []);

  const calculatedSlices = calculateSlices(box.h);

  const sequenceType = useMemo(() => detectSequenceType(params), [params.tr, params.te, params.baseResolution]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const orientation = params.orientation || 'Axial';
    const atlasData = getAtlasData(orientation);
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

    if (!isActive && externalIsocenter) {
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      // Línea horizontal
      ctx.beginPath();
      ctx.moveTo(0, externalIsocenter.y);
      ctx.lineTo(CANVAS_SIZE, externalIsocenter.y);
      ctx.stroke();
      
      // Línea vertical
      ctx.beginPath();
      ctx.moveTo(externalIsocenter.x, 0);
      ctx.lineTo(externalIsocenter.x, CANVAS_SIZE);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }

  }, [params.tr, params.te, params.fatSuppression, params.baseResolution, params.averages, sequenceType, isActive, externalIsocenter]);

  // Factor de escala visual más controlado para evitar saturación
  const effectiveScale = Math.min(1.2, Math.max(0.8, sliceThickness / 4));
  const visualSliceThickness = Math.max(2, Math.min(8, sliceThickness * effectiveScale));
  const minGap = Math.max(1, visualSliceThickness * 0.15);
  const visualGap = Math.max(minGap, (gapPercentage / 100) * sliceThickness * 0.8);

  const sliceLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 0; i < calculatedSlices; i++) {
      lines.push(i);
    }
    return lines;
  }, [calculatedSlices, visualSliceThickness, visualGap]);

  const phaseDirLabel = params.phaseEncodingDir.includes('R') || params.phaseEncodingDir.includes('L') ? 'R' :
                        params.phaseEncodingDir.includes('A') || params.phaseEncodingDir.includes('P') ? 'A' : 'R';

  const phaseArrowRotation = params.phaseEncodingDir.includes('R >> L') ? 0 :
                             params.phaseEncodingDir.includes('L >> R') ? 180 :
                             params.phaseEncodingDir.includes('A >> P') ? 90 :
                             params.phaseEncodingDir.includes('P >> A') ? 270 : 0;

  return (
    <div ref={containerRef} className="relative border border-slate-700 bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-full h-full block pointer-events-none"
      />

      <div className="absolute top-0 left-0 right-0 h-6 bg-[#111] border-b border-slate-700 flex items-center justify-between px-2 text-[9px]">
        <span className="text-yellow-400/80 font-mono">{data.title}</span>
        <div className="flex gap-2 text-gray-400 font-mono">
          <span className={sequenceType === 'T1' ? 'text-blue-400' : sequenceType === 'T2' ? 'text-green-400' : sequenceType === 'FLAIR' ? 'text-purple-400' : ''}>
            {sequenceType}
          </span>
          <span>TH: {sliceThickness}mm</span>
          <span>Gap: {gapPercentage}%</span>
          <span className="text-yellow-400">Slices: {calculatedSlices}</span>
        </div>
      </div>

      <div
        className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/5 cursor-move z-30"
        style={{
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full cursor-pointer hover:bg-yellow-300 z-20"
          title="Rotate"
          onMouseDown={handleRotateStart}
        />
        
        <div
          className="absolute -bottom-3 -right-3 w-4 h-4 bg-yellow-400 cursor-se-resize hover:bg-yellow-300 z-20"
          title="Scale (stretch from center)"
          onMouseDown={handleScaleStart}
        />

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

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 border-2 border-yellow-400 bg-black rounded-full pointer-events-none z-10" />

        <div className="absolute -bottom-6 right-2 flex items-center gap-1 pointer-events-none">
          <span className="text-yellow-400 text-[10px] font-bold">{phaseDirLabel}</span>
          <div 
            className="w-6 h-0.5 bg-yellow-400 relative"
            style={{ transform: `rotate(${phaseArrowRotation}deg)`, transformOrigin: 'left center' }}
          >
            <div className="absolute right-0 -top-1.5 border-y-2.5 border-l-4 border-transparent border-yellow-400" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-1 right-1 text-[8px] text-white/40 font-mono">
        ISO: {Math.round(getIsocenter().x)},{Math.round(getIsocenter().y)} | {Math.round(box.w)}x{Math.round(box.h)} | {Math.round(rotation)}°
      </div>

      {params.satBands?.filter(b => b.enabled).map((band, idx) => {
        const isocenterX = box.x + box.w / 2;
        const isocenterY = box.y + box.h / 2;
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
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,255,255,0.3) 3px, rgba(0,255,255,0.3) 6px)'
              }}
            />
          </div>
        );
      })}

      {/* Marks Anatómicas según orientación */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 text-[10px] font-bold">
        <span className="text-yellow-400">
          {params.orientation === 'Sagittal' ? 'SAG' : params.orientation === 'Coronal' ? 'COR' : 'AX'}
        </span>
      </div>
      <div className="absolute top-1/2 left-1 text-[9px] text-yellow-400 font-bold">
        {params.orientation === 'Sagittal' ? 'L' : params.orientation === 'Coronal' ? 'A' : 'R'}
      </div>
      <div className="absolute top-1/2 right-1 text-[9px] text-yellow-400 font-bold">
        {params.orientation === 'Sagittal' ? 'R' : params.orientation === 'Coronal' ? 'P' : 'L'}
      </div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-yellow-400 font-bold">
        {params.orientation === 'Sagittal' ? 'P' : params.orientation === 'Coronal' ? 'I' : 'A'}
      </div>
    </div>
  );
}