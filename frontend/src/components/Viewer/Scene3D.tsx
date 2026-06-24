import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PlaneMesh, type FilterUniforms } from './PlaneMesh';
import { FOVCube } from './FOVCube';
import { getAtlasData } from '../../core/atlas';
import { type FOVBox } from '../../core/fovMath';

interface Scene3DProps {
  fovBox: FOVBox;
  uniforms: FilterUniforms;
}

export function Scene3D({ fovBox, uniforms }: Scene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.DataTexture>(null);

  // Create atlas texture
  const atlasData = getAtlasData('Axial');
  const texture = new THREE.DataTexture(
    atlasData,
    256,
    256,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;
  textureRef.current = texture;

  const planeWidth = 220;
  const planeHeight = 220;

  useEffect(() => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [uniforms]);

  return (
    <group ref={groupRef}>
      {/* Axial Plane */}
      <PlaneMesh
        orientation="Axial"
        texture={texture}
        width={planeWidth}
        height={planeHeight}
        uniforms={uniforms}
      />
      {/* Coronal Plane */}
      <PlaneMesh
        orientation="Coronal"
        texture={texture}
        width={planeWidth}
        height={planeHeight}
        uniforms={uniforms}
      />
      {/* Sagittal Plane */}
      <PlaneMesh
        orientation="Sagittal"
        texture={texture}
        width={planeWidth}
        height={planeHeight}
        uniforms={uniforms}
      />
      {/* FOV Cube */}
      <FOVCube fovBox={fovBox} sliceThickness={uniforms.uSliceThickness} slices={uniforms.uSlices} />
    </group>
  );
}
