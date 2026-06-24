import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  type FOVBox,
  type SlicePosition,
  calculateSlicePositions,
  calculateSliceCoverage,
  getViewportCameraParams,
  getSliceLineEndpoints,
} from '../../core/fovMath';
import { getAtlasData } from '../../core/atlas';
import { mriFilterVertexShader } from '../../shaders/mri-filter.vert';
import { mriFilterFragmentShader } from '../../shaders/mri-filter.frag';
import { type FilterUniforms } from './PlaneMesh';

type ViewportOrient = 'Axial' | 'Coronal' | 'Sagittal';
type SequenceOrient = 'Axial' | 'Coronal' | 'Sagittal';

interface ViewportGridProps {
  params: {
    sliceThickness: number;
    slices: number;
    distanceFactor: number;
    fovRead: number;
    fovPhase: number;
    tr: number;
    te: number;
    flipAngle: number;
    averages: number;
    fatSuppression: string;
    baseResolution: number;
    phaseResolution: number;
    phasePartialFourier: string;
    phaseEncodingDir: string;
    phaseOversampling: number;
    concatenations: number;
    coilElements: string;
    gradientMode: string;
    multibandFactor: number;
    sequenceName: string;
    bValue?: number;
    hasInfarct?: boolean;
    infarctLocation?: { x: number; y: number; radius: number };
    satBands?: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      thickness: number;
      angle: number;
      enabled: boolean;
    }>;
    orientation: SequenceOrient;
    wc: number;
    ww: number;
  };
  fovBox: FOVBox;
  onFOVChange?: (fovBox: FOVBox) => void;
}

function getSequenceTypeValue(name: string, tr: number, te: number, baseResolution: number): number {
  const n = name.toUpperCase();
  const hasDWI = n.includes('DWI') || n.includes('DIFFUSION') || n.includes('EPI') || n.includes('TRACE') || baseResolution < 128;
  if (hasDWI) return 3;
  if (tr < 800 && te < 30) return 0;
  if (tr > 7000 && te > 80) return 1;
  if (tr > 3000 && te > 80) return 4;
  return 2;
}

function getSatBandUniform(
  bands: Array<{ x: number; y: number; width: number; thickness: number; enabled: boolean }> | undefined,
  index: number
): [number, number, number, number] {
  if (!bands) return [0, 0, 0, 0];
  const enabled = bands.filter(b => b.enabled);
  if (index >= enabled.length) return [0, 0, 0, 0];
  const band = enabled[index];
  return [band.x + 128, band.y + 128, band.width / 2, band.thickness / 2];
}

function buildUniforms(params: ViewportGridProps['params']): FilterUniforms {
  return {
    uSequenceType: getSequenceTypeValue(params.sequenceName, params.tr, params.te, params.baseResolution),
    uFatSuppression: params.fatSuppression === 'FatSat' ? 1 : params.fatSuppression === 'STIR' ? 2 : 0,
    uBaseResolution: params.baseResolution,
    uNoiseFactor: params.averages <= 1 ? 25 : params.averages === 2 ? 15 : 8,
    uWc: params.wc,
    uWw: params.ww,
    uTime: 0,
    uBValue: params.bValue || 0,
    uHasInfarct: params.hasInfarct ? 1 : 0,
    uInfarctCenter: params.infarctLocation ? [params.infarctLocation.x, params.infarctLocation.y, 0] : [0, 0, 0],
    uInfarctRadius: params.infarctLocation?.radius || 0,
    uRotation: 0,
    uSliceThickness: params.sliceThickness,
    uSlices: params.slices,
    uDistanceFactor: params.distanceFactor,
    uSatBand1: getSatBandUniform(params.satBands, 0),
    uSatBand2: getSatBandUniform(params.satBands, 1),
    uSatBandCount: params.satBands?.filter(b => b.enabled).length || 0,
  };
}

function makeMaterial(atlasOrientation: ViewportOrient, uniforms: FilterUniforms) {
  const atlasData = getAtlasData(atlasOrientation);
  const atlasTexture = new THREE.DataTexture(atlasData, 256, 256, THREE.RGBAFormat);
  atlasTexture.needsUpdate = true;

  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: atlasTexture },
      uSequenceType: { value: uniforms.uSequenceType },
      uFatSuppression: { value: uniforms.uFatSuppression },
      uBaseResolution: { value: uniforms.uBaseResolution },
      uNoiseFactor: { value: uniforms.uNoiseFactor },
      uWc: { value: uniforms.uWc },
      uWw: { value: uniforms.uWw },
      uTime: { value: uniforms.uTime },
      uBValue: { value: uniforms.uBValue },
      uHasInfarct: { value: uniforms.uHasInfarct },
      uInfarctCenter: { value: new THREE.Vector3(...uniforms.uInfarctCenter) },
      uInfarctRadius: { value: uniforms.uInfarctRadius },
      uRotation: { value: uniforms.uRotation },
      uSliceThickness: { value: uniforms.uSliceThickness },
      uSlices: { value: uniforms.uSlices },
      uDistanceFactor: { value: uniforms.uDistanceFactor },
      uSatBand1: { value: new THREE.Vector4(...uniforms.uSatBand1) },
      uSatBand2: { value: new THREE.Vector4(...uniforms.uSatBand2) },
      uSatBandCount: { value: uniforms.uSatBandCount },
    },
    vertexShader: mriFilterVertexShader,
    fragmentShader: mriFilterFragmentShader,
    side: THREE.DoubleSide,
  });
}

interface ViewportLabel {
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

function getViewportLabels(vp: ViewportOrient): ViewportLabel[] {
  if (vp === 'Axial') {
    return [
      { text: 'AX', position: 'top' },
      { text: 'R', position: 'left' },
      { text: 'L', position: 'right' },
      { text: 'A', position: 'bottom' },
    ];
  }
  if (vp === 'Coronal') {
    return [
      { text: 'COR', position: 'top' },
      { text: 'R', position: 'left' },
      { text: 'L', position: 'right' },
      { text: 'S', position: 'bottom' },
    ];
  }
  return [
    { text: 'SAG', position: 'top' },
    { text: 'A', position: 'left' },
    { text: 'P', position: 'right' },
    { text: 'S', position: 'bottom' },
  ];
}

function getLabelPosition(position: ViewportLabel['position']): string {
  const base = 'absolute text-[10px] text-yellow-400 font-bold pointer-events-none z-10';
  switch (position) {
    case 'top': return `${base} top-0.5 left-1`;
    case 'bottom': return `${base} top-4 left-1/2 -translate-x-1/2`;
    case 'left': return `${base} top-1/2 left-0.5 -translate-y-1/2`;
    case 'right': return `${base} top-1/2 right-0.5 -translate-y-1/2`;
  }
}

function whichViewport(clientX: number, clientY: number, rect: DOMRect, _side: 'left' | 'right'): ViewportOrient {
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  if (x < halfW) {
    return y < halfH ? 'Coronal' : 'Axial';
  }
  return 'Sagittal';
}

function createFOVMesh(fov: FOVBox, orientation: SequenceOrient): THREE.Group {
  const group = new THREE.Group();

  const boxGeo = new THREE.BoxGeometry(fov.size.read, fov.size.phase, fov.size.depth);

  switch (orientation) {
    case 'Coronal':
      group.rotation.x = Math.PI / 2;
      break;
    case 'Sagittal':
      group.rotation.z = Math.PI / 2;
      break;
    case 'Axial':
    default:
      break;
  }

  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edges = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0xffff00 }));
  group.add(edges);

  const solidMat = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.03,
    side: THREE.DoubleSide,
  });
  const solid = new THREE.Mesh(boxGeo, solidMat);
  solid.name = 'fovBox';
  group.add(solid);

  const corners = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
  ];
  const handleGeo = new THREE.SphereGeometry(2, 8, 8);
  const handleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

  corners.forEach(([cx, cy, cz]) => {
    const handle = new THREE.Mesh(handleGeo, handleMat.clone());
    handle.position.set(
      cx * fov.size.read / 2,
      cy * fov.size.phase / 2,
      cz * fov.size.depth / 2
    );
    handle.name = 'handle';
    handle.userData.corner = [cx, cy, cz];
    group.add(handle);
  });

  group.position.set(...fov.position);
  return group;
}

export function ViewportGrid({ params, fovBox, onFOVChange }: ViewportGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);
  const texturesRef = useRef<THREE.DataTexture[]>([]);
  const frameRef = useRef<number>(0);
  const fovGroupRef = useRef<THREE.Group | null>(null);
  const camerasRef = useRef<THREE.OrthographicCamera[]>([]);
  const viewportsRef = useRef<Array<{ orient: ViewportOrient; cam: THREE.OrthographicCamera; vp: { x: number; y: number; w: number; h: number } }>>([]);

  const dragStateRef = useRef<{
    active: boolean;
    viewport: ViewportOrient | null;
    mode: 'drag' | 'resize' | null;
    startPointer: THREE.Vector3;
    startPos: [number, number, number];
    startSize: { read: number; phase: number; depth: number };
    startCorner: [number, number, number] | null;
    plane: THREE.Plane;
  }>({
    active: false,
    viewport: null,
    mode: null,
    startPointer: new THREE.Vector3(),
    startPos: [0, 0, 0],
    startSize: { read: 0, phase: 0, depth: 0 },
    startCorner: null,
    plane: new THREE.Plane(),
  });

  const [isDragging, setIsDragging] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>('default');

  const gap = params.sliceThickness * (params.distanceFactor / 100);
  const coverage = calculateSliceCoverage(params.sliceThickness, params.slices, gap);

  const currentFovBox: FOVBox = {
    position: fovBox.position,
    size: {
      read: params.fovRead,
      phase: params.fovRead * (params.fovPhase / 100),
      depth: coverage,
    },
  };

  const uniforms = buildUniforms(params);

  const commitFOV = useCallback((newBox: FOVBox) => {
    onFOVChange?.(newBox);
  }, [onFOVChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.autoClear = false;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const matAxial = makeMaterial('Axial', uniforms);
    const matCoronal = makeMaterial('Coronal', uniforms);
    const matSagittal = makeMaterial('Sagittal', uniforms);
    const materials = [matAxial, matCoronal, matSagittal];
    materialsRef.current = materials;
    texturesRef.current = [matAxial.uniforms.uTexture.value, matCoronal.uniforms.uTexture.value, matSagittal.uniforms.uTexture.value] as THREE.DataTexture[];

    const camParams = {
      axial: getViewportCameraParams(params.fovRead, currentFovBox.size.phase, coverage, 'Axial'),
      coronal: getViewportCameraParams(params.fovRead, currentFovBox.size.phase, coverage, 'Coronal'),
      sagittal: getViewportCameraParams(params.fovRead, currentFovBox.size.phase, coverage, 'Sagittal'),
    };

    const planeAxial = new THREE.Mesh(new THREE.PlaneGeometry(camParams.axial.planeWidth, camParams.axial.planeHeight), matAxial);
    scene.add(planeAxial);

    const planeCoronal = new THREE.Mesh(new THREE.PlaneGeometry(camParams.coronal.planeWidth, camParams.coronal.planeHeight), matCoronal);
    planeCoronal.rotation.x = Math.PI / 2;
    scene.add(planeCoronal);

    const planeSagittal = new THREE.Mesh(new THREE.PlaneGeometry(camParams.sagittal.planeWidth, camParams.sagittal.planeHeight), matSagittal);
    planeSagittal.rotation.y = Math.PI / 2;
    scene.add(planeSagittal);

    const slicePositions = calculateSlicePositions(
      currentFovBox,
      params.slices,
      params.sliceThickness,
      gap,
      params.orientation
    );

    const fovGroup = createFOVMesh(currentFovBox, params.orientation);
    scene.add(fovGroup);
    fovGroupRef.current = fovGroup;

    const viewports: typeof viewportsRef.current = [];
    const createCamera = (cp: { frustumWidth: number; frustumHeight: number }, pos: THREE.Vector3, look: THREE.Vector3) => {
      const cam = new THREE.OrthographicCamera(
        -cp.frustumWidth / 2, cp.frustumWidth / 2,
        cp.frustumHeight / 2, -cp.frustumHeight / 2,
        0.1, 1000
      );
      cam.position.copy(pos);
      cam.lookAt(look);
      return cam;
    };

    const cameraAxial = createCamera(camParams.axial, new THREE.Vector3(0, 0, 200), new THREE.Vector3(0, 0, 0));
    const cameraCoronal = createCamera(camParams.coronal, new THREE.Vector3(0, 200, 0), new THREE.Vector3(0, 0, 0));
    const cameraSagittal = createCamera(camParams.sagittal, new THREE.Vector3(200, 0, 0), new THREE.Vector3(0, 0, 0));
    camerasRef.current = [cameraAxial, cameraCoronal, cameraSagittal];

    const vpW = container.clientWidth / 3;
    const vpH = container.clientHeight;

    viewports.push({ orient: 'Axial', cam: cameraAxial, vp: { x: 0, y: 0, w: vpW, h: vpH } });
    viewports.push({ orient: 'Coronal', cam: cameraCoronal, vp: { x: vpW, y: 0, w: vpW, h: vpH } });
    viewports.push({ orient: 'Sagittal', cam: cameraSagittal, vp: { x: vpW * 2, y: 0, w: vpW, h: vpH } });
    viewportsRef.current = viewports;

    slicePositions.forEach((pos: SlicePosition) => {
      viewports.forEach(({ orient: vpOrient }) => {
        const [start, end] = getSliceLineEndpoints(pos, currentFovBox, params.orientation, vpOrient);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.6, transparent: true })
        );
        scene.add(line);
      });
    });

    let time = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.016;
      materials.forEach(m => { m.uniforms.uTime.value = time; });

      renderer.clear();

      viewports.forEach(({ cam, vp }) => {
        renderer.setViewport(vp.x, vp.y, vp.w, vp.h);
        renderer.setScissor(vp.x, vp.y, vp.w, vp.h);
        renderer.setScissorTest(true);
        renderer.clearDepth();
        renderer.render(scene, cam);
      });

      renderer.setScissorTest(false);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      materials.forEach(m => m.dispose());
      texturesRef.current.forEach(t => t.dispose());
    };
  }, [params.sequenceName, params.tr, params.te, params.fatSuppression, params.baseResolution, params.averages, params.wc, params.ww, params.bValue, params.hasInfarct, params.sliceThickness, params.slices, params.distanceFactor, params.satBands, params.orientation, params.fovRead, params.fovPhase, fovBox.position, coverage]);

  const getViewportCamera = (vp: ViewportOrient): THREE.OrthographicCamera | undefined => {
    const map: Record<ViewportOrient, number> = { Axial: 0, Coronal: 1, Sagittal: 2 };
    return camerasRef.current[map[vp]];
  };

  const getRaycastTargets = (): THREE.Object3D[] => {
    const group = fovGroupRef.current;
    if (!group) return [];
    return group.children.filter(c => c.name === 'fovBox' || c.name === 'handle');
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const vp = whichViewport(e.clientX, e.clientY, rect, e.clientX < rect.width / 2 ? 'left' : 'right');
    const cam = getViewportCamera(vp);
    if (!cam) return;

    const vpData = viewportsRef.current.find(v => v.orient === vp);
    if (!vpData) return;

    const raycaster = new THREE.Raycaster();
    const ndcX = ((e.clientX - rect.left - vpData.vp.x) / vpData.vp.w) * 2 - 1;
    const ndcY = -((e.clientY - rect.top - vpData.vp.y) / vpData.vp.h) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

    const targets = getRaycastTargets();
    const hits = raycaster.intersectObjects(targets, false);

    const ds = dragStateRef.current;

    if (hits.length > 0) {
      const hit = hits[0];
      const isHandle = hit.object.name === 'handle';
      const hitPoint = hit.point.clone();

      let restrictionNormal = new THREE.Vector3();
      switch (vp) {
        case 'Axial':
          restrictionNormal.set(0, 0, 1);
          break;
        case 'Coronal':
          restrictionNormal.set(0, 1, 0);
          break;
        case 'Sagittal':
          restrictionNormal.set(1, 0, 0);
          break;
      }
      ds.plane.setFromNormalAndCoplanarPoint(restrictionNormal, hitPoint);
      ds.startPointer.copy(hitPoint);
      ds.startPos = [...fovBox.position] as [number, number, number];
      ds.startSize = { ...currentFovBox.size };
      ds.active = true;
      ds.viewport = vp;

      if (isHandle) {
        ds.mode = 'resize';
        ds.startCorner = (hit.object as THREE.Mesh).userData.corner as [number, number, number];
        setCursorStyle('nwse-resize');
      } else {
        ds.mode = 'drag';
        ds.startCorner = null;
        setCursorStyle('grab');
      }
      setIsDragging(true);
      canvas.setPointerCapture(e.pointerId);
    }
  }, [fovBox.position, currentFovBox.size]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ds = dragStateRef.current;
    const group = fovGroupRef.current;

    if (!ds.active || !canvas || !container || !group) return;

    const rect = container.getBoundingClientRect();
    const vp = ds.viewport;
    if (!vp) return;
    const cam = getViewportCamera(vp);
    if (!cam) return;
    const vpData = viewportsRef.current.find(v => v.orient === vp);
    if (!vpData) return;

    const raycaster = new THREE.Raycaster();
    const ndcX = ((e.clientX - rect.left - vpData.vp.x) / vpData.vp.w) * 2 - 1;
    const ndcY = -((e.clientY - rect.top - vpData.vp.y) / vpData.vp.h) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);

    const newPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(ds.plane, newPoint);
    if (!newPoint) return;

    const delta = newPoint.clone().sub(ds.startPointer);

    if (ds.mode === 'drag') {
      let newX = ds.startPos[0];
      let newY = ds.startPos[1];
      let newZ = ds.startPos[2];

      switch (vp) {
        case 'Axial':
          newX = ds.startPos[0] + delta.x;
          newY = ds.startPos[1] + delta.y;
          break;
        case 'Coronal':
          newX = ds.startPos[0] + delta.x;
          newZ = ds.startPos[2] + delta.z;
          break;
        case 'Sagittal':
          newY = ds.startPos[1] + delta.y;
          newZ = ds.startPos[2] + delta.z;
          break;
      }

      group.position.set(newX, newY, newZ);
    } else if (ds.mode === 'resize' && ds.startCorner) {
      const [cx, cy, cz] = ds.startCorner;
      let deltaRead = 0;
      let deltaPhase = 0;
      let deltaDepth = 0;

      switch (vp) {
        case 'Axial':
          deltaRead = cx * delta.x;
          deltaPhase = cy * delta.y;
          break;
        case 'Coronal':
          deltaRead = cx * delta.x;
          deltaDepth = cz * delta.z;
          break;
        case 'Sagittal':
          deltaPhase = cy * delta.y;
          deltaDepth = cz * delta.z;
          break;
      }

      const newRead = Math.max(50, Math.min(500, ds.startSize.read + deltaRead));
      const newPhase = Math.max(50, Math.min(500, ds.startSize.phase + deltaPhase));
      const newDepth = Math.max(10, Math.min(200, ds.startSize.depth + deltaDepth));

      const newBox: FOVBox = {
        position: [group.position.x, group.position.y, group.position.z],
        size: { read: newRead, phase: newPhase, depth: newDepth },
      };

      sceneRef.current?.remove(group);
      const newGroup = createFOVMesh(newBox, params.orientation);
      sceneRef.current?.add(newGroup);
      fovGroupRef.current = newGroup;
    }
  }, [params.orientation]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const ds = dragStateRef.current;
    const group = fovGroupRef.current;

    if (ds.active && group) {
      const newBox: FOVBox = {
        position: [group.position.x, group.position.y, group.position.z],
        size: {
          read: currentFovBox.size.read,
          phase: currentFovBox.size.phase,
          depth: currentFovBox.size.depth,
        },
      };

      const boxGeo = (group.children.find(c => c.name === 'fovBox') as THREE.Mesh)?.geometry as THREE.BoxGeometry;
      if (boxGeo) {
        newBox.size = {
          read: boxGeo.parameters.width,
          phase: boxGeo.parameters.height,
          depth: boxGeo.parameters.depth,
        };
      }

      if (ds.mode === 'drag' || ds.mode === 'resize') {
        commitFOV(newBox);
      }
    }

    ds.active = false;
    ds.mode = null;
    ds.viewport = null;
    ds.startCorner = null;
    setIsDragging(false);
    setCursorStyle('default');

    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
  }, [currentFovBox.size, commitFOV]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) setCursorStyle('default');
  }, [isDragging]);

  const handleMouseEnter = useCallback(() => {
    if (!isDragging) setCursorStyle('crosshair');
  }, [isDragging]);

  const vpW = containerRef.current ? containerRef.current.clientWidth / 3 : 200;

  const renderViewportLabels = (orient: ViewportOrient, x: number) => {
    const labels = getViewportLabels(orient);
    return labels.map((l, i) => (
      <div
        key={`${orient}-${i}`}
        className={getLabelPosition(l.position)}
        style={{ left: x + (l.position === 'left' ? 4 : l.position === 'right' ? vpW - 24 : 8) }}
      >
        {l.text}
      </div>
    ));
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: cursorStyle }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      />
      {renderViewportLabels('Axial', 0)}
      {renderViewportLabels('Coronal', vpW)}
      {renderViewportLabels('Sagittal', vpW * 2)}
    </div>
  );
}