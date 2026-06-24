import { useRef, useState, useCallback } from 'react';
import type { FOVBox } from '../../../core/fovMath';
import * as THREE from 'three';

export function useFOVSync(initial: FOVBox) {
  const [committed, setCommitted] = useState<FOVBox>(initial);
  const draggingRef = useRef<FOVBox>(initial);
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback(() => {
    setIsDragging(true);
    draggingRef.current = { ...committed };
  }, [committed]);

  const updateDrag = useCallback((delta: THREE.Vector3) => {
    const current = draggingRef.current;
    draggingRef.current = {
      position: [
        current.position[0] + delta.x,
        current.position[1] + delta.y,
        current.position[2] + delta.z,
      ],
      size: { ...current.size },
    };
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setCommitted(draggingRef.current);
  }, []);

  const current = isDragging ? draggingRef.current : committed;

  return {
    committed,
    current,
    isDragging,
    startDrag,
    updateDrag,
    endDrag,
  };
}
