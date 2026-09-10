'use client';

import { useEffect, useRef } from 'react';

type Falloff = 'smooth' | 'linear';

type CursorGridProps = {
  color?: string;
  cellSize?: number;
  lineWidth?: number;
  radius?: number;
  /** Brightness curve from cursor distance: 'smooth' = smoothstep, 'linear' = linear falloff. */
  falloff?: Falloff;
  /** How long a cell stays at its last brightness after losing cursor/pulse influence, before fading. */
  holdTime?: number;
  /** How long the hold-to-zero fade takes once it starts. */
  fadeDuration?: number;
  /** Ceiling for a lit cell's stroke opacity. */
  maxOpacity?: number;
  /** Ceiling for a lit cell's fill opacity; 0 disables the fill entirely (grid-line-only look). */
  fillOpacity?: number;
  /** Baseline stroke opacity for cells with no cursor/pulse influence at all; 0 = fully clean at rest. */
  gridOpacity?: number;
  /** Corner radius per cell, in px; 0 = sharp squares. */
  cellCorners?: number;
  /** Click-pulse ring expansion rate, in px/s. */
  pulseSpeed?: number;
  /** Whether a click spawns an expanding ring pulse. */
  clickPulse?: boolean;
};

type CellState = {
  brightness: number;
  /** Timestamp the cell dropped out of direct influence, or -1 while still active. */
  frozenAt: number;
  /** Brightness snapshot at the moment it dropped, held for holdTime then faded to 0. */
  frozenValue: number;
};

type Pulse = { x: number; y: number; start: number; maxRadius: number };

// Reimplemented from reactbits.dev's Cursor Grid control panel (color,
// falloff, cellSize, radius, holdTime, fadeDuration, lineWidth, maxOpacity,
// fillOpacity, gridOpacity, cellCorners, pulseSpeed, clickPulse) since its
// source wasn't available to copy from directly. Cells track cursor/pulse
// distance directly each frame; when a cell drops out of range it holds its
// last brightness for `holdTime` ms, then fades linearly to 0 over
// `fadeDuration` ms -- that hold+fade is what gives the trail its smoothness,
// not any cursor-position easing.
export function CursorGrid({
  color,
  cellSize = 50,
  lineWidth = 1,
  radius = 150,
  falloff = 'smooth',
  holdTime = 400,
  fadeDuration = 800,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellCorners = 0,
  pulseSpeed = 700,
  clickPulse = true,
}: CursorGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolvedColor =
      color ||
      getComputedStyle(document.documentElement).getPropertyValue('--color-akd-accent').trim() ||
      '#d0f864';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supportsRoundRect = typeof ctx.roundRect === 'function';

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    const pulses: Pulse[] = [];
    let raf = 0;

    let cols = 0;
    let rows = 0;
    let cellStates: CellState[] = [];

    function rebuildCells() {
      cols = Math.ceil(width / cellSize) + 1;
      rows = Math.ceil(height / cellSize) + 1;
      cellStates = Array.from({ length: cols * rows }, () => ({
        brightness: 0,
        frozenAt: -1,
        frozenValue: 0,
      }));
    }

    function resize() {
      const rect = container!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildCells();
    }

    function onMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function onClick(e: MouseEvent) {
      if (!clickPulse) return;
      const rect = container!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > width || y > height) return;
      pulses.push({ x, y, start: performance.now(), maxRadius: Math.hypot(width, height) });
      if (pulses.length > 6) pulses.shift();
    }

    function falloffCurve(t: number): number {
      // t is 0 (at radius edge) .. 1 (at the source). Smoothstep vs linear.
      return falloff === 'smooth' ? t * t * (3 - 2 * t) : t;
    }

    function targetBrightness(cx: number, cy: number, now: number): number {
      let target = 0;
      const dCursor = Math.hypot(cx - mouse.x, cy - mouse.y);
      if (dCursor < radius) target = Math.max(target, falloffCurve(1 - dCursor / radius));
      for (const pulse of pulses) {
        const elapsedSec = (now - pulse.start) / 1000;
        const ringRadius = elapsedSec * pulseSpeed;
        if (ringRadius > pulse.maxRadius) continue;
        const dPulse = Math.hypot(cx - pulse.x, cy - pulse.y);
        const ringWidth = 90;
        const dRing = Math.abs(dPulse - ringRadius);
        if (dRing < ringWidth) {
          const progress = ringRadius / pulse.maxRadius;
          target = Math.max(target, (1 - dRing / ringWidth) * (1 - progress));
        }
      }
      return target;
    }

    function updateCell(state: CellState, target: number, now: number) {
      if (target > 0) {
        state.brightness = target;
        state.frozenAt = -1;
        return;
      }
      if (state.frozenAt < 0) {
        state.frozenAt = now;
        state.frozenValue = state.brightness;
      }
      if (reduceMotion) {
        state.brightness = 0;
        return;
      }
      const elapsed = now - state.frozenAt;
      if (elapsed < holdTime) {
        state.brightness = state.frozenValue;
      } else {
        const fadeT = Math.min(1, (elapsed - holdTime) / fadeDuration);
        state.brightness = state.frozenValue * (1 - fadeT);
      }
    }

    function drawCell(x: number, y: number, brightness: number) {
      const strokeAlpha = Math.min(1, gridOpacity + brightness * maxOpacity);
      const fillAlpha = fillOpacity > 0 ? brightness * fillOpacity : 0;
      if (strokeAlpha <= 0.015 && fillAlpha <= 0.015) return;

      const draw = (path: () => void) => {
        path();
        if (fillAlpha > 0.015) {
          ctx!.fillStyle = withAlpha(resolvedColor, fillAlpha);
          ctx!.fill();
        }
        if (strokeAlpha > 0.015) {
          ctx!.strokeStyle = withAlpha(resolvedColor, strokeAlpha);
          ctx!.stroke();
        }
      };

      if (cellCorners > 0 && supportsRoundRect) {
        draw(() => {
          ctx!.beginPath();
          ctx!.roundRect(x, y, cellSize, cellSize, cellCorners);
        });
      } else {
        draw(() => {
          ctx!.beginPath();
          ctx!.rect(x, y, cellSize, cellSize);
        });
      }
    }

    function draw(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = pulses.length - 1; i >= 0; i--) {
        const elapsedSec = (now - pulses[i].start) / 1000;
        if (elapsedSec * pulseSpeed > pulses[i].maxRadius) pulses.splice(i, 1);
      }

      ctx.lineWidth = lineWidth;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellSize;
          const y = row * cellSize;
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const idx = row * cols + col;
          const state = cellStates[idx];
          if (!state) continue;
          const target = targetBrightness(cx, cy, now);
          updateCell(state, target, now);
          drawCell(x, y, state.brightness);
        }
      }

      raf = requestAnimationFrame(draw);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('click', onClick);
    raf = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('click', onClick);
      cancelAnimationFrame(raf);
    };
  }, [
    color,
    cellSize,
    lineWidth,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellCorners,
    pulseSpeed,
    clickPulse,
  ]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}

function withAlpha(hexOrRgba: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  if (hexOrRgba.startsWith('#') && hexOrRgba.length === 7) {
    const r = parseInt(hexOrRgba.slice(1, 3), 16);
    const g = parseInt(hexOrRgba.slice(3, 5), 16);
    const b = parseInt(hexOrRgba.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }
  return hexOrRgba;
}
