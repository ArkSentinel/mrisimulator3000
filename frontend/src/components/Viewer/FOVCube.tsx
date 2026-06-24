import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { type FOVBox } from '../../core/fovMath';

interface FOVCubeProps {
  fovBox: FOVBox;
  sliceThickness: number;
  slices: number;
}

export function FOVCube({ fovBox, sliceThickness, slices }: FOVCubeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineRefs = useRef<THREE.Line[]>([]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear old lines
    lineRefs.current.forEach(line => {
      group.remove(line);
      line.geometry.dispose();
    });
    lineRefs.current = [];

    // Create FOV cube edges
    const geometry = new THREE.BoxGeometry(fovBox.size.read, fovBox.size.phase, fovBox.size.depth);
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffff00 }));
    line.position.set(...fovBox.position);
    group.add(line);

    // Create slice lines
    const gap = sliceThickness * 0.1; // 10% gap
    const totalDepth = sliceThickness * slices + gap * (slices - 1);
    const startZ = fovBox.position[2] - totalDepth / 2;

    for (let i = 0; i < slices; i++) {
      const z = startZ + sliceThickness / 2 + (sliceThickness + gap) * i;
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
          fovBox.position[0] - fovBox.size.read / 2,
          fovBox.position[1] - fovBox.size.phase / 2,
          z
        ),
        new THREE.Vector3(
          fovBox.position[0] + fovBox.size.read / 2,
          fovBox.position[1] - fovBox.size.phase / 2,
          z
        ),
      ]);
      const sliceLine = new THREE.Line(
        lineGeometry,
        new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true })
      );
      group.add(sliceLine);
      lineRefs.current.push(sliceLine);
    }
  }, [fovBox, sliceThickness, slices]);

  return <group ref={groupRef} />;
}
