import { expect, test } from 'vitest';


import { Quaternion, Vector3, Euler } from 'three';
import { zipCombine } from '../src/system/arrays'
import { Body } from '../src/body/Body';



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
})
