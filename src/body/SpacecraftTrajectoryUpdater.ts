import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { Clock } from '../system/Clock.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { Vector } from '../system/Vector.ts';
import { TrajectoryPoint } from '../domain/models.ts';

type Vec3 = [number, number, number];

export class SpacecraftTrajectoryUpdater implements BodySystemUpdater {
  isOneTimeUpdate = false;
  isEnabled = true;

  update(bodyObjects3D: Map<string, BodyObject3D>, _timestepMs: number, clock: Clock): Map<string, BodyObject3D> {
    const t = clock.getTime();

    for (const o of bodyObjects3D.values()) {
      const b = o.body;
      if (b.type !== 'spacecraft' || !b.useTrajectory || !b.isActive()) continue;

      const pts = b.missionWindow?.trajectory;
      if (!pts || pts.length < 2) continue;

      const sample = hermiteSample(pts, t);
      if (!sample) continue;

      const [p, v] = sample;
      b.position = new Vector(p[0], p[1], p[2]);
      b.velocity = new Vector(v[0], v[1], v[2]);
    }

    return bodyObjects3D;
  }
}

/**
 * Hermite cubic interpolation between two trajectory points.
 *
 * Returns interpolated [position, velocity] at time `t`, or undefined if `t` falls
 * outside the trajectory's covered range.
 */
export function hermiteSample(pts: TrajectoryPoint[], t: number): [Vec3, Vec3] | undefined {
  const last = pts.length - 1;
  if (t < pts[0].timeMs || t > pts[last].timeMs) return undefined;

  const span = pts[1].timeMs - pts[0].timeMs;
  let idx = Math.floor((t - pts[0].timeMs) / span);
  if (idx < 0) idx = 0;
  if (idx > last - 1) idx = last - 1;

  const a = pts[idx];
  const b = pts[idx + 1];

  const dtMs = b.timeMs - a.timeMs;
  const dt = dtMs / 1000; // seconds — velocities are m/s
  const s = (t - a.timeMs) / dtMs;

  const s2 = s * s;
  const s3 = s2 * s;

  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;

  // dp/dt = (1/dt) * dp/ds
  const dh00 = (6 * s2 - 6 * s) / dt;
  const dh10 = 3 * s2 - 4 * s + 1;
  const dh01 = (-6 * s2 + 6 * s) / dt;
  const dh11 = 3 * s2 - 2 * s;

  const p: Vec3 = [0, 0, 0];
  const v: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    p[i] = h00 * a.position[i] + h10 * dt * a.velocity[i] + h01 * b.position[i] + h11 * dt * b.velocity[i];
    v[i] = dh00 * a.position[i] + dh10 * a.velocity[i] + dh01 * b.position[i] + dh11 * b.velocity[i];
  }

  return [p, v];
}
