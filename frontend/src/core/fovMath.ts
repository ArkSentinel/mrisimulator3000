import * as THREE from 'three';

export interface FOVBox {
  position: [number, number, number];
  size: {
    read: number;
    phase: number;
    depth: number;
  };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VolumeBox {
  fovRead: number;
  fovPhase: number;
  coverage: number;
  isocenterX: number;
  isocenterY: number;
  rotation: number;
}

export type SliceOrientation = 'Axial' | 'Coronal' | 'Sagittal';

export interface SlicePosition {
  x: number;
  y: number;
  z: number;
}

export function calculateSliceCoverage(
  thickness: number,
  slices: number,
  gap: number
): number {
  return thickness * slices + gap * (slices - 1);
}

export function calculateSlicePositions(
  fov: FOVBox,
  sliceCount: number,
  thickness: number,
  gap: number,
  orientation: SliceOrientation = 'Axial'
): SlicePosition[] {
  const coverage = calculateSliceCoverage(thickness, sliceCount, gap);
  const start = -coverage / 2;
  const positions: SlicePosition[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const offset = (thickness + gap) * i;
    const center = start + thickness / 2 + offset;
    let pos: SlicePosition;

    switch (orientation) {
      case 'Coronal':
        pos = { x: fov.position[0], y: center, z: fov.position[2] };
        break;
      case 'Sagittal':
        pos = { x: center, y: fov.position[1], z: fov.position[2] };
        break;
      case 'Axial':
      default:
        pos = { x: fov.position[0], y: fov.position[1], z: center };
        break;
    }
    positions.push(pos);
  }
  return positions;
}

export interface ViewportCameraParams {
  frustumWidth: number;
  frustumHeight: number;
  planeWidth: number;
  planeHeight: number;
}

export function getViewportCameraParams(
  fovRead: number,
  fovPhase: number,
  _coverage: number,
  viewportOrientation: 'Axial' | 'Coronal' | 'Sagittal'
): ViewportCameraParams {
  switch (viewportOrientation) {
    case 'Axial':
      return {
        frustumWidth: fovRead * 1.2,
        frustumHeight: fovPhase * 1.2,
        planeWidth: fovRead,
        planeHeight: fovPhase,
      };
    case 'Coronal':
      return {
        frustumWidth: fovRead * 1.2,
        frustumHeight: fovPhase * 1.2,
        planeWidth: fovRead,
        planeHeight: fovPhase,
      };
    case 'Sagittal':
      return {
        frustumWidth: fovRead * 1.2,
        frustumHeight: fovPhase * 1.2,
        planeWidth: fovRead,
        planeHeight: fovPhase,
      };
  }
}

export function getSliceLineEndpoints(
  pos: SlicePosition,
  fov: FOVBox,
  sequenceOrientation: SliceOrientation,
  viewportOrientation: 'Axial' | 'Coronal' | 'Sagittal'
): [THREE.Vector3, THREE.Vector3] {
  let start: THREE.Vector3;
  let end: THREE.Vector3;

  switch (sequenceOrientation) {
    case 'Coronal':
      if (viewportOrientation === 'Axial') {
        start = new THREE.Vector3(pos.x - fov.size.read / 2, pos.y, pos.z);
        end = new THREE.Vector3(pos.x + fov.size.read / 2, pos.y, pos.z);
      } else {
        start = new THREE.Vector3(pos.x, pos.y, pos.z - fov.size.phase / 2);
        end = new THREE.Vector3(pos.x, pos.y, pos.z + fov.size.phase / 2);
      }
      break;
    case 'Sagittal':
      if (viewportOrientation === 'Axial') {
        start = new THREE.Vector3(pos.x, pos.y, pos.z - fov.size.phase / 2);
        end = new THREE.Vector3(pos.x, pos.y, pos.z + fov.size.phase / 2);
      } else {
        start = new THREE.Vector3(pos.x, pos.y - fov.size.read / 2, pos.z);
        end = new THREE.Vector3(pos.x, pos.y + fov.size.read / 2, pos.z);
      }
      break;
    case 'Axial':
    default:
      start = new THREE.Vector3(pos.x - fov.size.read / 2, pos.y, pos.z);
      end = new THREE.Vector3(pos.x + fov.size.read / 2, pos.y, pos.z);
      break;
  }

  return [start, end];
}