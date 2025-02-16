
import { Body } from './Body.ts';
// import { OrbitingBody } from './OrbitOutliner.ts';
import { Vector } from "../system/Vector";
import { timeMsToUnits, timePeriodToMs, TimeUnit, unitsToMs } from '../system/time.ts';
// import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { OrbitingBody, OrbitLength, OrbitLengthType } from './OrbitOutliner.ts';
import { OrbitalOutline } from '../mesh/OrbitOutline.ts';
import { convertDistance, DistanceUnits } from '../system/distance.ts';

const UNIT_PERIOD = timePeriodToMs({days: 365, hours: 6});
const UNIT_DISTANCE = DistanceUnits.au;
const MAX_VERTICES = 360 * 4 * 10;
const STEPS_PER_ORBIT = 360*4*10;


class OrbitingBodyWithPositionAttribute extends Body{
  orbitalOutline?: OrbitalOutline;
  constructor(b: OrbitingBody){
    super(b);
    if(b.needsOrbit){
      this.orbitalOutline =  new OrbitalOutline(MAX_VERTICES);
    }
  }
};


  onmessage = (event) => {
    const data = event.data;

    const bodyProperties = data.bodies as OrbitingBody[];
    const orbitLength = data.orbitLength as OrbitLength;

    const orbitingBodyWithPositionAttribute = bodyProperties.map(b =>  new OrbitingBodyWithPositionAttribute(b));
    // set up hierarchy
    orbitingBodyWithPositionAttribute.forEach(b => b.parent = orbitingBodyWithPositionAttribute.find(o => o.name == b.parentName));


    const orbitingObjects = calculateOrbits(orbitLength, orbitingBodyWithPositionAttribute);
    // we are only interested with the arrayBuffers...

    const response = orbitingObjects
    .filter(o => o.orbitalOutline != undefined).map(o => (
      { 
        name: o.name, 
        buffer: o.orbitalOutline?.getPositionAttribute().array.buffer,
        index: o.orbitalOutline?.index
      }));

    const transferables = orbitingObjects
      .map(o => o.orbitalOutline?.getPositionAttribute().array.buffer);

    const x = [...transferables.filter(t => t != undefined)];


    if(x == undefined){
      postMessage({response: response});
    }else{
      postMessage({response: response}, x);
    }

    
  };


function calculateOrbits(orbitLength: OrbitLength, orbittingBodies: OrbitingBodyWithPositionAttribute[]   ): OrbitingBodyWithPositionAttribute[] {

  // time period only based on planets. Find smallest period.
  const timePeriod = orbittingBodies
    .filter(o => o.type == "planet")
    .map(o => approximateOrbitalPeriod(o))
    .reduce((prev, current) => prev < current? prev: current,  Number.MAX_VALUE);

  const timestep = timeMsToUnits(timePeriod/STEPS_PER_ORBIT, TimeUnit.Seconds);
  const nbSteps =  STEPS_PER_ORBIT * (orbitLength.type == OrbitLengthType.Time? orbitLength.value / timePeriod : orbitLength.value / 360); 

  for(let j = 0; j < nbSteps; j++) {
    updateKinematics(orbittingBodies, -timestep);
  }
  return orbittingBodies;  
}



function updateKinematics(orbitingObjects: OrbitingBodyWithPositionAttribute[], timestep: number){
  
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
      orbitingObject.orbitalOutline.addPosition(orbitingObject.position)
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
 * Only applicable to bodies orbiting around the sun (not useful for moons etc...). Uses Keplers relationship
 * based on bodies orbiting the sun.
 * 
 * Simplifies calculations by using the Unit distance and period to be those of earth around the sun. 
 * Hence:
 *    1 Astronomical Unit (AU) corresponds to a Period of 365days and 6 hours
 * 
 * @param b 
 * @returns 
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