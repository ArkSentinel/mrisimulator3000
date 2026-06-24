export function generateAtlasData(
  width: number,
  height: number,
  orientation: 'Axial' | 'Sagittal' | 'Coronal' = 'Axial'
): Uint8Array {
  const data = new Uint8Array(width * height);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dx = x - centerX;
      const dy = y - centerY;

      let dist: number;
      if (orientation === 'Sagittal') {
        dist = Math.sqrt((dx / 1.3) ** 2 + dy ** 2);
      } else if (orientation === 'Coronal') {
        dist = Math.sqrt((dx / 0.9) ** 2 + (dy / 1.1) ** 2);
      } else {
        dist = Math.sqrt(dx * dx + dy * dy);
      }

      if (dist < 100) {
        if (dist > 85) {
          data[idx] = 10;
        } else {
          data[idx] = getBrainPixelValue(x, y, centerX, centerY, dist, orientation);
        }
      } else {
        data[idx] = 0;
      }
    }
  }

  return data;
}

function getBrainPixelValue(
  x: number,
  y: number,
  cx: number,
  cy: number,
  dist: number,
  orientation: 'Axial' | 'Sagittal' | 'Coronal' = 'Axial'
): number {
  let relX: number;
  let relY: number;

  if (orientation === 'Sagittal') {
    relX = (x - cx) / 100;
    relY = (y - cy) / 65;
  } else if (orientation === 'Coronal') {
    relX = (x - cx) / 90;
    relY = (y - cy) / 70;
  } else {
    relX = (x - cx) / 80;
    relY = (y - cy) / 65;
  }

  const lVentricleX = -0.25;
  const lVentricleY = -0.15;
  const rVentricleX = 0.35;
  const rVentricleY = -0.1;
  const ventricleRadius = 0.12;

  const lVentricleDist = Math.sqrt((relX - lVentricleX) ** 2 + (relY - lVentricleY) ** 2);
  const rVentricleDist = Math.sqrt((relX - rVentricleX) ** 2 + (relY - rVentricleY) ** 2);
  const thirdVentricleDist = Math.sqrt(relX ** 2 + (relY + 0.15) ** 2);
  const fourthVentricleDist = Math.sqrt(relX ** 2 + (relY - 0.5) ** 2);

  const corpusCallosumY = -0.05;
  const corpusCallosumDist = Math.abs(relY - corpusCallosumY);
  const isInCallosum = Math.abs(relX) < 0.35 && corpusCallosumDist < 0.08;

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

  let value: number;

  if (
    lVentricleDist < ventricleRadius ||
    rVentricleDist < ventricleRadius ||
    thirdVentricleDist < 0.06 ||
    fourthVentricleDist < 0.07
  ) {
    value = 250;
  } else if (isInCallosum) {
    value = 70 + Math.random() * 15;
  } else if (caudateDist < nucleiRadius || putamenDist < nucleiRadius || thalamusDist < nucleiRadius) {
    value = 90 + Math.random() * 20;
  } else if (dist < 75) {
    value = 55 + Math.random() * 25;
  } else if (dist < 82) {
    value = 100 + Math.random() * 30;
  } else {
    value = 110 + Math.random() * 25;
  }

  return Math.round(value);
}

const atlasCache = new Map<string, Uint8Array>();

export function getAtlasData(
  orientation: 'Axial' | 'Sagittal' | 'Coronal' = 'Axial'
): Uint8Array {
  const cacheKey = `atlas-256-${orientation}`;
  if (!atlasCache.has(cacheKey)) {
    atlasCache.set(cacheKey, generateAtlasData(256, 256, orientation));
  }
  return atlasCache.get(cacheKey)!;
}
