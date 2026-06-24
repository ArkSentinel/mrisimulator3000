import { useRef, useCallback } from 'react';
import * as THREE from 'three';

interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  startPoint: THREE.Vector3;
  startPosition: THREE.Vector3;
  startSize: THREE.Vector3;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  plane: THREE.Plane;
}

export function useFOVDrag(
  camera: THREE.Camera,
  domElement: HTMLElement | null,
  onDrag: (delta: THREE.Vector3) => void,
  onResize: (delta: THREE.Vector3) => void
) {
  const stateRef = useRef<DragState>({
    isDragging: false,
    isResizing: false,
    startPoint: new THREE.Vector3(),
    startPosition: new THREE.Vector3(),
    startSize: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  });

  const getIntersects = useCallback(
    (clientX: number, clientY: number, objects: THREE.Object3D[]) => {
      const state = stateRef.current;
      if (!domElement) return [];
      const rect = domElement.getBoundingClientRect();
      state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, camera);
      return state.raycaster.intersectObjects(objects, false);
    },
    [camera, domElement]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent, fovMesh: THREE.Mesh, fovGroup: THREE.Group) => {
      const state = stateRef.current;
      const intersects = getIntersects(e.clientX, e.clientY, [fovMesh]);
      if (intersects.length === 0) return;

      const hit = intersects[0];
      const isResize = (e.target as HTMLElement)?.closest?.('[data-fov-resize]');

      state.plane.setFromNormalAndCoplanarPoint(
        camera.position.clone().sub(hit.point).normalize(),
        hit.point
      );
      state.startPoint.copy(hit.point);
      state.startPosition.copy(fovGroup.position);
      state.startSize.set(
        (fovMesh.geometry as THREE.BoxGeometry).parameters.width,
        (fovMesh.geometry as THREE.BoxGeometry).parameters.height,
        (fovMesh.geometry as THREE.BoxGeometry).parameters.depth
      );

      if (isResize) {
        state.isResizing = true;
      } else {
        state.isDragging = true;
      }
    },
    [camera, getIntersects]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const state = stateRef.current;
      if (!state.isDragging && !state.isResizing) return;
      if (!domElement) return;

      const rect = domElement.getBoundingClientRect();
      state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, camera);

      const newPoint = new THREE.Vector3();
      state.raycaster.ray.intersectPlane(state.plane, newPoint);
      if (!newPoint) return;

      const delta = newPoint.clone().sub(state.startPoint);

      if (state.isDragging) {
        onDrag(delta);
      } else if (state.isResizing) {
        onResize(delta);
      }
    },
    [camera, domElement, onDrag, onResize]
  );

  const handlePointerUp = useCallback(() => {
    const state = stateRef.current;
    state.isDragging = false;
    state.isResizing = false;
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
