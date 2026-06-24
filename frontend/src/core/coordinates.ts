export interface SliceOrientation {
  rowVector: [number, number, number];
  colVector: [number, number, number];
  normalVector: [number, number, number];
  position: [number, number, number];
}

export const RAS = {
  x: 1, // Right
  y: 1, // Anterior
  z: 1, // Superior
};

export const LPS = {
  x: -1, // Left
  y: -1, // Posterior
  z: -1, // Inferior
};

export const AXIAL_ORIENTATION: SliceOrientation = {
  rowVector: [1, 0, 0],
  colVector: [0, 1, 0],
  normalVector: [0, 0, 1],
  position: [0, 0, 0],
};

export const CORONAL_ORIENTATION: SliceOrientation = {
  rowVector: [1, 0, 0],
  colVector: [0, 0, 1],
  normalVector: [0, 1, 0],
  position: [0, 0, 0],
};

export const SAGITTAL_ORIENTATION: SliceOrientation = {
  rowVector: [0, 1, 0],
  colVector: [0, 0, 1],
  normalVector: [1, 0, 0],
  position: [0, 0, 0],
};

export function getOrientationByName(
  name: 'Axial' | 'Coronal' | 'Sagittal'
): SliceOrientation {
  switch (name) {
    case 'Axial':
      return AXIAL_ORIENTATION;
    case 'Coronal':
      return CORONAL_ORIENTATION;
    case 'Sagittal':
      return SAGITTAL_ORIENTATION;
  }
}
