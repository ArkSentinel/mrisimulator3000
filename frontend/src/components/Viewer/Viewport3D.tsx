import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene3D } from './Scene3D';
import { type FOVBox } from '../../core/fovMath';
import { type FilterUniforms } from './PlaneMesh';

interface Viewport3DProps {
  x: number;
  y: number;
  width: number;
  height: number;
  cameraPosition: [number, number, number];
  cameraUp: [number, number, number];
  fovBox: FOVBox;
  uniforms: FilterUniforms;
}

export function Viewport3D({
  x,
  y,
  width,
  height,
  cameraPosition,
  cameraUp,
  fovBox,
  uniforms,
}: Viewport3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        overflow: 'hidden',
      }}
    >
      <Canvas
        orthographic
        camera={{
          position: cameraPosition,
          up: cameraUp,
          zoom: 1,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene3D fovBox={fovBox} uniforms={uniforms} />
      </Canvas>
    </div>
  );
}
