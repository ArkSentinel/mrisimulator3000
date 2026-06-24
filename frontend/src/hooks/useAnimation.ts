import { useEffect, useRef } from 'react';

interface UseAnimationOptions {
  isRunning: boolean;
  onDraw: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
}

export function useAnimation({ isRunning, onDraw }: UseAnimationOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const onDrawRef = useRef(onDraw);
  const isRunningRef = useRef(isRunning);

  onDrawRef.current = onDraw;
  isRunningRef.current = isRunning;

  const drawRef = useRef<(timestamp: number) => void>(() => {});

  drawRef.current = (timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = timestamp;
    }
    const elapsed = timestamp - startTimeRef.current;

    onDrawRef.current(ctx, canvas.width, canvas.height, elapsed);

    if (isRunningRef.current) {
      animationRef.current = requestAnimationFrame(drawRef.current);
    }
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(drawRef.current);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  return canvasRef;
}
