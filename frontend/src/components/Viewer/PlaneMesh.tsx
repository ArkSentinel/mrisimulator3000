import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { mriFilterVertexShader } from '../../shaders/mri-filter.vert';
import { mriFilterFragmentShader } from '../../shaders/mri-filter.frag';

export interface FilterUniforms {
  uSequenceType: number;
  uFatSuppression: number;
  uBaseResolution: number;
  uNoiseFactor: number;
  uWc: number;
  uWw: number;
  uTime: number;
  uBValue: number;
  uHasInfarct: number;
  uInfarctCenter: [number, number, number];
  uInfarctRadius: number;
  uRotation: number;
  uSliceThickness: number;
  uSlices: number;
  uDistanceFactor: number;
  uSatBand1: [number, number, number, number];
  uSatBand2: [number, number, number, number];
  uSatBandCount: number;
}

interface PlaneMeshProps {
  orientation: 'Axial' | 'Coronal' | 'Sagittal';
  texture: THREE.Texture;
  width: number;
  height: number;
  uniforms: FilterUniforms;
}

export function PlaneMesh({ orientation, texture, width, height, uniforms }: PlaneMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
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

  materialRef.current = material;

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;

    mat.uniforms.uSequenceType.value = uniforms.uSequenceType;
    mat.uniforms.uFatSuppression.value = uniforms.uFatSuppression;
    mat.uniforms.uBaseResolution.value = uniforms.uBaseResolution;
    mat.uniforms.uNoiseFactor.value = uniforms.uNoiseFactor;
    mat.uniforms.uWc.value = uniforms.uWc;
    mat.uniforms.uWw.value = uniforms.uWw;
    mat.uniforms.uTime.value = uniforms.uTime;
    mat.uniforms.uBValue.value = uniforms.uBValue;
    mat.uniforms.uHasInfarct.value = uniforms.uHasInfarct;
    mat.uniforms.uInfarctCenter.value.set(...uniforms.uInfarctCenter);
    mat.uniforms.uInfarctRadius.value = uniforms.uInfarctRadius;
    mat.uniforms.uRotation.value = uniforms.uRotation;
    mat.uniforms.uSliceThickness.value = uniforms.uSliceThickness;
    mat.uniforms.uSlices.value = uniforms.uSlices;
    mat.uniforms.uDistanceFactor.value = uniforms.uDistanceFactor;
    mat.uniforms.uSatBand1.value.set(...uniforms.uSatBand1);
    mat.uniforms.uSatBand2.value.set(...uniforms.uSatBand2);
    mat.uniforms.uSatBandCount.value = uniforms.uSatBandCount;
    mat.uniforms.uTexture.value = texture;
    mat.uniformsNeedUpdate = true;
  }, [uniforms, texture]);

  // Orient plane according to orientation
  const rotation = new THREE.Euler();
  if (orientation === 'Coronal') {
    rotation.x = Math.PI / 2;
  } else if (orientation === 'Sagittal') {
    rotation.y = Math.PI / 2;
  }

  return (
    <mesh ref={meshRef} rotation={rotation} material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}
