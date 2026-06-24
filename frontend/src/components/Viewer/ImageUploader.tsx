import { useRef, useCallback } from 'react';
import * as THREE from 'three';

interface ImageUploaderProps {
  onImageLoad: (texture: THREE.Texture, viewport: 'Axial' | 'Coronal' | 'Sagittal') => void;
}

export function ImageUploader({ onImageLoad }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (viewport: 'Axial' | 'Coronal' | 'Sagittal') => {
      const input = inputRef.current;
      if (!input) return;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          onImageLoad(texture, viewport);
          URL.revokeObjectURL(url);
        });
      };
      input.click();
    },
    [onImageLoad]
  );

  return (
    <div className="absolute top-2 left-2 z-40 flex gap-1">
      <input ref={inputRef} type="file" accept="image/png, image/jpeg" className="hidden" />
      <button
        onClick={() => handleFileSelect('Axial')}
        className="px-2 py-1 bg-[#1a1a1a] border border-slate-700 text-[10px] text-gray-300 hover:text-white hover:bg-slate-700"
      >
        Load Axial
      </button>
      <button
        onClick={() => handleFileSelect('Coronal')}
        className="px-2 py-1 bg-[#1a1a1a] border border-slate-700 text-[10px] text-gray-300 hover:text-white hover:bg-slate-700"
      >
        Load Coronal
      </button>
      <button
        onClick={() => handleFileSelect('Sagittal')}
        className="px-2 py-1 bg-[#1a1a1a] border border-slate-700 text-[10px] text-gray-300 hover:text-white hover:bg-slate-700"
      >
        Load Sagittal
      </button>
    </div>
  );
}
