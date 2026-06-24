import { type SliceOrientation } from './coordinates';

export function sliceToWorldMatrix(
  orientation: SliceOrientation
): number[] {
  const [rx, ry, rz] = orientation.rowVector;
  const [cx, cy, cz] = orientation.colVector;
  const [nx, ny, nz] = orientation.normalVector;
  const [px, py, pz] = orientation.position;

  return [
    rx, cx, nx, px,
    ry, cy, ny, py,
    rz, cz, nz, pz,
    0, 0, 0, 1,
  ];
}

export function worldToPixelMatrix(
  width: number,
  height: number,
  fovMm: number
): number[] {
  const scale = Math.min(width, height) / fovMm;
  const offsetX = width / 2;
  const offsetY = height / 2;

  return [
    scale, 0, 0, offsetX,
    0, -scale, 0, offsetY,
    0, 0, scale, 0,
    0, 0, 0, 1,
  ];
}

export function multiplyMatrices(a: number[], b: number[]): number[] {
  const result: number[] = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] =
        a[i * 4 + 0] * b[0 * 4 + j] +
        a[i * 4 + 1] * b[1 * 4 + j] +
        a[i * 4 + 2] * b[2 * 4 + j] +
        a[i * 4 + 3] * b[3 * 4 + j];
    }
  }
  return result;
}
