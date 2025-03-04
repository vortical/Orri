import { Body } from '../body/Body.ts';
// import { OrbitingBody } from './OrbitOutliner.ts';
import { Vector } from "../system/Vector.ts";
import { timeMsToUnits, timePeriodToMs, TimeUnit, unitsToMs } from '../system/time.ts';
// import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { OrbitLength, OrbitLengthType } from './OrbitOutline.ts';
import { OrbitalOutline } from './OrbitOutline.ts';
import { convertDistance, DistanceUnits } from '../system/distance.ts';
import { toDeg } from '../system/geometry.ts';
import { BodyProperties, BodyType } from '../domain/models.ts';

const UNIT_PERIOD = timePeriodToMs({days: 365, hours: 6});
const UNIT_DISTANCE = DistanceUnits.au;

const STEPS_PER_ORBIT = 360*4*10;

class OrbitingBodyWithPositionAttribute extends Body {
  orbitalOutline?: OrbitalOutline;
  constructor(b: BodyProperties, withOrbitalOutline: boolean){
    super(b);
    if(withOrbitalOutline){
      this.orbitalOutline =  new OrbitalOutline();
    }

    // if(b.type == 'planet'){
    //   this.orbitalOutline =  new OrbitalOutline();
    // }
  }
};


onmessage = (event) => {

  const data = event.data;
  const bodyProperties = data.bodies as BodyProperties[];
  const orbitLength = data.orbitLength as OrbitLength;
  const desiredOrbitBodyName = data.desiredOrbitBodyName;
 
  const orbitingBodyWithPositionAttribute = bodyProperties.map(b =>  new OrbitingBodyWithPositionAttribute(b, b.name == desiredOrbitBodyName));
  // set up hierarchy
  orbitingBodyWithPositionAttribute.forEach(b => b.parent = orbitingBodyWithPositionAttribute.find(o => o.name == b.parentName));
  const orbitingObjects = calculateOrbits(orbitLength, orbitingBodyWithPositionAttribute);
  // we are only interested with the arrayBuffers...

  const response = orbitingObjects
    .filter(o => o.orbitalOutline != undefined).map(o => (
      { 
        name: o.name, 
        buffer: o.orbitalOutline?.getPositionAttribute().array.buffer,
        index: o.orbitalOutline?.endIndex
      }));

  const transferables = orbitingObjects
    .map(o => o.orbitalOutline?.getPositionAttribute().array.buffer)
    .filter(o => o !== undefined);

  postMessage({response: response}, [...transferables]);

};



function iterationVariablesForAngle(timePeriodMs: number, angleDegrees: number,type: BodyType ): [number, number] {
  
  let stepsPerOrbit = STEPS_PER_ORBIT;
  let nbSteps =  stepsPerOrbit *  angleDegrees/ 360;
  
  // angle is less than ~ 200th of a degree. We want minimum of 3 vertices
  if(nbSteps < 3){ 
    stepsPerOrbit = 3*360/angleDegrees;
    nbSteps =  stepsPerOrbit *  angleDegrees/ 360;
  }
  
  const timestep = timeMsToUnits(timePeriodMs/stepsPerOrbit, TimeUnit.Seconds);
  return [nbSteps, timestep];

}

function iterationVariablesForTime(timePeriodMs: number, timeMs: number, type: BodyType): [number, number] {
  // TODO: just convert the time to degrees and use iterationVariablesForAngle

  // limit to one if type planet - else limit to 30 orbits
  if(type == "moon"){
    timeMs = Math.min(timePeriodMs*30, timeMs);
  }else{
    timeMs = Math.min(timePeriodMs, timeMs);
  }

  if(timeMs < 0.001){
    timeMs = 0.001;
  }
  let stepsPerOrbit = STEPS_PER_ORBIT;

  let nbSteps =  stepsPerOrbit * timeMs / timePeriodMs;
  // time is less than a 200th of a degree. Its can be represented with 3 vertices.
  if(nbSteps < 3){ 
    stepsPerOrbit = 3*timePeriodMs/timeMs;
    nbSteps = stepsPerOrbit * timeMs/timePeriodMs;
  }

  const timestep = timeMsToUnits(timePeriodMs/stepsPerOrbit, TimeUnit.Seconds);
  return [nbSteps, timestep];
}

function calculateOrbits(orbitLength: OrbitLength, orbittingBodies: OrbitingBodyWithPositionAttribute[]   ): OrbitingBodyWithPositionAttribute[] {
  // Find smallest period.
  const timePeriod = orbittingBodies
    .filter(o => o.type == "planet" || o.type == "moon")
    .map(o => o.orbitPeriod? timePeriodToMs(o.orbitPeriod) : approximateOrbitalPeriod(o))
    .reduce((prev, current) => prev < current? prev: current,  Number.MAX_VALUE);

  if(timePeriod ==  Number.MAX_VALUE){
    return orbittingBodies;  
  }

  const type = orbittingBodies.find(b => b.orbitalOutline != null)!.type;

  const iterationVariables = orbitLength.lengthType == OrbitLengthType.AngleDegrees? iterationVariablesForAngle:iterationVariablesForTime;
  const [nbSteps, timestep] = iterationVariables(timePeriod, orbitLength.value, type);  

  for(let j = 0; j < nbSteps; j++) {
    updateKinematics(orbittingBodies, -timestep);
  }
  
  // The timesteps are negative, which means the lines is going backwards in time.
  orbittingBodies.forEach(o => o.orbitalOutline?.flipPositionBufferAttribute());


  return orbittingBodies;  
}


function updateKinematics(orbitingObjects: OrbitingBodyWithPositionAttribute[], timestep: number) {
  

  // calculate positions using  accelerations from previous update
  for(const orbitingObject of orbitingObjects) {
    orbitingObject.acceleration = orbitingObject.acceleration || bodyAcceleration(orbitingObject);
    orbitingObject.position = orbitingObject.nextPosition(orbitingObject.acceleration, timestep);  
  }

  // get new accelerations from updated positions, then calculate
  // velocities based on the avg acceleration
  for(const orbitingObject of orbitingObjects) {
    const a = orbitingObject.acceleration!;
    const b =  bodyAcceleration(orbitingObject);
    const avgAcceleration =  { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    orbitingObject.velocity = orbitingObject.nextSpeed(avgAcceleration, timestep)
    // save acceleration for calculation of position at i+1
    orbitingObject.acceleration = b;
    if(orbitingObject.orbitalOutline != undefined){
      orbitingObject.orbitalOutline.addPosition(orbitingObject.position);
    }
  }
}

function bodyAcceleration(b: Body): Vector {
  let parent = b.parent;

  const acceleration = new Vector();
  while(parent != undefined){
      acceleration.add(Body.twoBodyAcceleration(b, parent));        
      parent = parent.parent;
  }
  
  return acceleration;
}



/**
 * Uses Keplers relationship based on bodies orbiting the sun.
 * 
 * Simplifies calculations by using the Unit distance and period to be those of earth around the sun. 
 * Hence:
 *    1 Astronomical Unit (AU) corresponds to a Period of 365 days and 6 hours
 * 
 * 
 * 
 * @param b 
 * @returns Math.pow((distance of the body in AU),  1.5)
 */
function approximateOrbitalPeriod(b: Body): number{
  
  let parent = b.parent;
  if(parent != undefined){
    // calculate AU distance of body from its parent
    const rBodyAU = convertDistance(Vector.substract(parent.position, b.position).magnitude(), DistanceUnits.m, UNIT_DISTANCE);
    // then we use Kepler's relaytionship to determine period.
    return Math.pow(rBodyAU, 1.5) * UNIT_PERIOD;
  } 
  
  return Number.MAX_VALUE;
}
