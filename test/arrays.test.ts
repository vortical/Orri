import { assert, expect, test } from 'vitest';


import { Quaternion, Vector3, Euler } from 'three';
import { zipCombine , partial} from '../src/system/arrays'
import { toRad, toDeg } from '../src/system/geometry';
import { Vector } from '../src/system/vecs';

test('partial', () => {

    function add(a: number, b: number, c: number): number{
        return a + b + c;
    }
    
    assert(partial(add)(1, 2 ,3) == 1 + 2 + 3)
    assert(partial(add, 1)(2 ,3) == 1 + 2 + 3)
    assert(partial(add, 1, 2)(3) == 1 + 2 + 3)
    assert(partial(add, 1, 2, 3)() == 1 + 2 + 3)

});



test('tutorial', () => {




        
});




test('angles', () => {


    function angleTo(v1: Vector, v2: Vector, plane: Vector): number {

        // don't reall need to project
        const v1Projected = v1.clone().projectOnPlane(plane)
        const v2Projected = v2.clone().projectOnPlane(plane);
        
        let angle = v1Projected.angleTo(v2Projected);  

        const cross = v1Projected.clone().cross(v2Projected);
        
        return cross.angleTo(plane) < Math.PI/2 ? angle: Math.PI*2-angle;
    }


    // clockwise from x
    const a = new Vector(1,0,0);
    const b = new Vector(0,0,-1);
    const c = new Vector(-1,0,0);
    const d = new Vector(0,0,1);


    const ab = a.clone().applyAxisAngle(new Vector(0, 1, 0), toRad(45)).normalize();
    const ad = a.clone().applyAxisAngle(new Vector(0, 1, 0), toRad(-45)).normalize();

    const planeNormal = a.clone().cross(b);

    let angle0 = toDeg(angleTo(a, b, planeNormal));
    let angle1 = toDeg(angleTo(a, ab, planeNormal));
    let angle2 = toDeg(angleTo(ab, b, planeNormal));
    let angle3 = toDeg(angleTo(a, c, planeNormal));
    let angle4 = toDeg(angleTo(ad, ab, planeNormal));
    let angle5 = toDeg(angleTo(ab, ad, planeNormal));
    let angle6 = toDeg(angleTo(b, a, planeNormal));



    console.log(ab);
    console.log(ad);
    expect(a).toEqual(a);

});

test('adjust speed', () => {

    const q = new Quaternion().setFromAxisAngle( new Vector3(0,1,0), Math.PI/2);
    // const speed = new Vec3D(0, 0, 29780 - 1023.16);
    const speed = new Vector3(0, 0, - 1023.16);


    const axisAngle = speed.clone().applyQuaternion(q).normalize();
    const a = toRad(90);
  
    const quaternion = new Quaternion().setFromAxisAngle( axisAngle, a);
  
    const result = speed.clone().applyQuaternion(quaternion);
    console.log(result);
    expect(result).toEqual(3);

});




test('quaternions', () => {

    function a(){
        const q = new Quaternion().setFromAxisAngle(Vector.fromVectorComponents({x: 0, y: 1, z:0}), Math.PI/2);
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
})

test('some other test', () => {
    const r = zipCombine([1,2,3], [4,5,6], (a,b) => a * b);
    expect(r.length).to.equal(3);
    expect(r).toEqual([1*4, 2 * 5, 3 * 6]);
});