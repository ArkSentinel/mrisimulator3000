export function applyWindowLevel(
  pixelValue: number,
  wc: number,
  ww: number
): number {
  const min = wc - ww / 2;
  const max = wc + ww / 2;
  const clamped = Math.min(Math.max(pixelValue, min), max);
  const normalized = ((clamped - min) / (max - min)) * 255;
  return Math.max(0, Math.min(255, normalized));
}

export function applyWindowLevelRgba(
  pixels: Uint8ClampedArray,
  wc: number,
  ww: number
): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const v = pixels[i];
    const newV = applyWindowLevel(v, wc, ww);
    pixels[i] = newV;
    pixels[i + 1] = newV;
    pixels[i + 2] = newV;
  }
}
