import { expect, test } from 'vitest';


import { Quaternion, Vector3, Euler } from 'three';
import { zipCombine } from '../src/system/arrays'
import { toRad } from '../src/system/geometry';
import { Body } from '../src/body/Body';
import { Vec3D } from '../src/system/vecs';

test('adjust speed', () => {

    const q = new Quaternion().setFromAxisAngle( new Vector3(0,1,0), Math.PI/2);
    // const speed = new Vec3D(0, 0, 29780 - 1023.16);
    const speed = new Vector3(0, 0, 1);

    const axisAngle = speed.clone().applyQuaternion(q);
    const a = toRad(90);
  
    const quaternion = new Quaternion().setFromAxisAngle( axisAngle, a);
  
    const result = speed.clone().applyQuaternion(quaternion);
    console.log(result);
    expect(result).toEqual(3);

})




test('quaternions', () => {

    function a(){
        const q = new Quaternion().setFromAxisAngle({x: 0, y: 1, z:0}, Math.PI/2);
        return new Vector3(1,0,0).applyQuaternion(q);
    }

    function b(){
        const e = new Euler(0, Math.PI/2, 0);
        return  new Vector3(1,0,0).applyEuler(e);
    }

    function c() {

        const axis = new Vector3(0, 1, 0).applyEuler(new Euler(0,0, -Math.PI/2));
        console.log(axis);
    }

    expect(a()).toEqual(b());

    c();

})

test('some test', () => {
    const r = zipCombine([1,2,3], [4,5,6], (a,b) => a * b);
    const l = r.length;
    expect(l).toEqual(3);
    expect(r == [1*4, 2 * 5, 3 * 6]);
})

test('some other test', () => {
    const r = zipCombine([1,2,3], [4,5,6], (a,b) => a * b);
    expect(r.length).to.equal(3);
    expect(r).toEqual([1*4, 2 * 5, 3 * 6]);
});