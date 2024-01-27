import { Quaternion, Vector3 } from "three";
import { Body } from "../body/Body";
import { BodyProperties } from "../body/models";
import { Vec3D } from "../system/vecs";
import { toRad } from "../system/geometry";





/**
 * Kind of messy, but our initial data needs to be massaged until we figure out exactly how
 * we want to pass in the initial data (e.g.: a data server returning in exact position and speeds for a 
 * specific time). 
 * 
 * @param body 
 * @returns 
 */
function postCreate(body: Body){


    /**
     * initial speeds are given in 2D, but they are to be aligned along the orbit plane of the body.
     * 
     * 
     */
    function transposeSpeedToOrbitalPlane(body: Body){
  
      if(body.orbitInclination && body.orbitInclination != 0){
  
        // Determine an axis that is 90 degrees rotated around y axis of speed vector, 
        // the oribital tilt will be applied from that axis.
        const childLocalSpeed = body.speed.toVector3();
        
        const rotateAroundY = new Quaternion().setFromAxisAngle( new Vector3(0,1,0), Math.PI/2);
        const axisAngle = childLocalSpeed.clone().applyQuaternion(rotateAroundY).normalize();
        
        // Quaternion of the orbital plane
        const quaternion = new Quaternion().setFromAxisAngle( axisAngle, toRad(body.orbitInclination));
        
        const childSpeedOnOrbitalPlane = childLocalSpeed.clone().applyQuaternion(quaternion);
        // Transform the 2D speed of the child onto the orbital plane and add the parent vector
        const parentSpeed = body.parent!.speed.toVector3();
        body.speed = Vec3D.fromVector(parentSpeed.add(childSpeedOnOrbitalPlane));        
        // need to also add parents position)
        body.position = Vec3D.add(body.position, body.parent!.position);
      }

      return body;
    }

    return transposeSpeedToOrbitalPlane(body);
}

export function createBodies(payload: any): Body[] {

    const payloadBodies = payload as BodyProperties[];
    const bodies = payloadBodies.map((payload) => new Body(payload));
    
    // we need parent body to establish the orbital plane and initial speeds (and positions)
    bodies
    .filter((b) => b.parentName)
    .forEach((b) => b.parent = bodies.find((parent) => parent.name == b.parentName ));

    return bodies.map((b) => postCreate(b));

}