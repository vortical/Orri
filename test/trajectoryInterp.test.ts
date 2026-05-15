import { expect, test } from 'vitest';
import { hermiteSample } from '../src/body/SpacecraftTrajectoryUpdater.ts';
import { TrajectoryPoint } from '../src/domain/models.ts';

const MINUTE_MS = 60_000;

function pt(timeMs: number, position: [number, number, number], velocity: [number, number, number]): TrajectoryPoint {
  return { timeMs, position, velocity };
}

test('hermite returns endpoint values exactly at sample times', () => {
  const pts = [
    pt(0, [10, 20, 30], [1, 2, 3]),
    pt(MINUTE_MS, [70, 140, 210], [1, 2, 3]),
  ];

  const [p0, v0] = hermiteSample(pts, 0)!;
  expect(p0).toEqual([10, 20, 30]);
  expect(v0).toEqual([1, 2, 3]);

  const [p1, v1] = hermiteSample(pts, MINUTE_MS)!;
  expect(p1[0]).toBeCloseTo(70);
  expect(p1[1]).toBeCloseTo(140);
  expect(p1[2]).toBeCloseTo(210);
  expect(v1[0]).toBeCloseTo(1);
  expect(v1[1]).toBeCloseTo(2);
  expect(v1[2]).toBeCloseTo(3);
});

test('constant velocity segment produces linear position and constant velocity', () => {
  // p1 = p0 + v * dt.  dt = 60s, v = (1, 2, 3) m/s, so p1 - p0 = (60, 120, 180).
  const pts = [
    pt(0, [0, 0, 0], [1, 2, 3]),
    pt(MINUTE_MS, [60, 120, 180], [1, 2, 3]),
  ];

  const [pMid, vMid] = hermiteSample(pts, MINUTE_MS / 2)!;
  expect(pMid[0]).toBeCloseTo(30);
  expect(pMid[1]).toBeCloseTo(60);
  expect(pMid[2]).toBeCloseTo(90);
  expect(vMid[0]).toBeCloseTo(1);
  expect(vMid[1]).toBeCloseTo(2);
  expect(vMid[2]).toBeCloseTo(3);
});

test('out-of-range time returns undefined', () => {
  const pts = [
    pt(1000, [0, 0, 0], [0, 0, 0]),
    pt(1000 + MINUTE_MS, [0, 0, 0], [0, 0, 0]),
  ];
  expect(hermiteSample(pts, 999)).toBeUndefined();
  expect(hermiteSample(pts, 1000 + MINUTE_MS + 1)).toBeUndefined();
});

test('hermite is C1 continuous at internal sample boundaries', () => {
  const pts = [
    pt(0,             [0, 0, 0],      [10, 0, 0]),
    pt(MINUTE_MS,     [600, 0, 0],    [10, 5, 0]),
    pt(2 * MINUTE_MS, [1200, 300, 0], [10, 5, 0]),
  ];

  const eps = 1;
  const [pLeft,  vLeft]  = hermiteSample(pts, MINUTE_MS - eps)!;
  const [pAt,    vAt]    = hermiteSample(pts, MINUTE_MS)!;
  const [pRight, vRight] = hermiteSample(pts, MINUTE_MS + eps)!;

  const expectedP = pts[1].position;
  const expectedV = pts[1].velocity;

  for (let i = 0; i < 3; i++) {
    expect(pAt[i]).toBeCloseTo(expectedP[i], 6);
    expect(pLeft[i]).toBeCloseTo(expectedP[i], 1);
    expect(pRight[i]).toBeCloseTo(expectedP[i], 1);
  }

  for (let i = 0; i < 3; i++) {
    expect(vAt[i]).toBeCloseTo(expectedV[i], 6);
    expect(vLeft[i]).toBeCloseTo(expectedV[i], 1);
    expect(vRight[i]).toBeCloseTo(expectedV[i], 1);
  }
});
