import { assert, expect, test } from 'vitest';
import { toRad, toDeg, angleTo } from '../src/system/geometry';
import { Vector } from '../src/system/Vector';
import { LatLon } from '../src/system/LatLon';
import { Spherical, Vector3 } from 'three';



const PI = Math.PI;

test('angleTo on XZ plane', () => {

    const a = new Vector(1,0,0);
    const b = new Vector(0,0,-1);
    const c = new Vector(-1,0,0);
    const d = new Vector(0,0,1);

    const ab = a.clone().applyAxisAngle(new Vector(0, 1, 0), PI/4).normalize();
    const ad = a.clone().applyAxisAngle(new Vector(0, 1, 0), -PI/4).normalize();

    const planeNormal = a.clone().cross(b);    
    expect(angleTo(a, b, planeNormal)).toBeCloseTo(PI/2, 2); 
    expect(angleTo(a, ab, planeNormal)).toBeCloseTo(PI/4, 2); 
    expect(angleTo(ab, b, planeNormal)).toBeCloseTo(PI/4, 2); 
    expect(angleTo(a, c, planeNormal)).toBeCloseTo(PI, 2); 
    expect(angleTo(ad, ab, planeNormal)).toBeCloseTo(PI/2, 2); 
    expect(angleTo(ab, ad, planeNormal)).toBeCloseTo(3*PI/2, 2); 
    expect(angleTo(b, a, planeNormal)).toBeCloseTo(3*PI/2, 2);     
});


test("Viewer on latitude 60, lon 0 viewing object on lon 0", () => {
    const pos = new Vector3().setFromSpherical(new Spherical(1, PI/6, 0));    
    const star = new Vector3().setFromSpherical(new Spherical(10000000, PI/2, 0));    
    const north = new Vector().crossVectors(new Vector(-1, 0,0), pos);
    expect(angleTo(star, north, pos)).toBeCloseTo(PI, 2);    
})

test("Viewer on latitude 45, lon 0 viewing object on lon 0", () => {
    const pos = new Vector3().setFromSpherical(new Spherical(1, PI/4, 0));    
    const star = new Vector3().setFromSpherical(new Spherical(10000000, PI/2, 0));    
    const north = new Vector().crossVectors(new Vector(-1, 0,0), pos);
    expect(angleTo(star, north, pos)).toBeCloseTo(PI, 2);    
})

test('Viewer at latitude 0, lon 0', () => {
    const pos = new Vector3().setFromSpherical(new Spherical(1, PI/2, 0));
    const star = new Vector3().setFromSpherical(new Spherical(10000, PI/2, PI/4));
    const north = new Vector(0,1,0).clone();
    expect(angleTo(star, north, pos)).toBeCloseTo(PI/2, 2); 
});


test("Viewer on latitude 45, lon 45 viewing object on lon 0", () => {
    const pos = new Vector3().setFromSpherical(new Spherical(1, PI/4, PI/4));    
    const star = new Vector3().setFromSpherical(new Spherical(10000000, PI/2, PI/4));        
    const axis = new Vector3().setFromSpherical(new Spherical(1, PI/2, -PI/4));
    const north = new Vector().crossVectors(axis, pos);
    expect(angleTo(star, north, pos)).toBeCloseTo(PI, 2);    
    expect(angleTo(axis, north, pos)).toBeCloseTo(3*PI/2, 2);    
})
