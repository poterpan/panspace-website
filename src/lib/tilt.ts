export const TILT_RANGE_DEG = 7;
export type Tilt = { rotateX: number; rotateY: number };

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const round = (v: number) => Math.round(v * 100) / 100 || 0; // `|| 0` turns -0 into 0

/** Pointer position inside a box → rotation. Total span is `range` degrees (±range/2 at the edges). */
export function tiltFor(x: number, y: number, width: number, height: number, range = TILT_RANGE_DEG): Tilt {
  if (width <= 0 || height <= 0) return { rotateX: 0, rotateY: 0 };
  const nx = clamp01(x / width) - 0.5;
  const ny = clamp01(y / height) - 0.5;
  return { rotateX: round(-ny * range), rotateY: round(nx * range) };
}

export function tiltTransform(t: Tilt): string {
  return `perspective(700px) rotateX(${t.rotateX}deg) rotateY(${t.rotateY}deg) translateZ(4px)`;
}
