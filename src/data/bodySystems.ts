    
import { Body }  from '../body/Body';
import { Vec3D } from '../system/vecs';


// 2 sets of bodies:
// solarsystem: includes all planets (+ earth's moon)
// earth: just earth and satellites (just ISS for now)

const bodySystems = {
    solarSystem:
  [
    //new Body("Sun", 1.989e30,  696340000, {x:0, y:0, z:0} as Vec3D, {x:0, y:0, z:0} as Vec3D),
    new Body("Sun", 1.989e30, 69634000, {x:0, y:0, z:0} as Vec3D, {x:0, y:0, z:0} as Vec3D),
    
    new Body("Mercury", 3.3022e23, 4878000/2, {x:57900000000, y:0, z:0} as Vec3D, {x:0, y:47400,z:0} as Vec3D),
    
    new Body("Venus", 4.869e24, 12756000/2, {x:0, y:108200000000,z:0} as Vec3D, {x:-35000, y:0,z:0} as Vec3D,),
    new Body("Earth", 5.9736e24, 12756000/2, {x:-149597870700, y:0, z:0} as Vec3D, {x:0, y:-30000, z:0} as Vec3D),
    // new Body("ISS", 4.19e5, 108, {x: -149597870700+12756000/2+410000, y:0} as Vec3D, {x:0, y: -30000+7679} as Vec3D ),
    new Body("Moon", 7.3477e22, 1737400, {x: -149597870700+384400000, y:0, z:0} as Vec3D, {x:0, y: -30000+1023, z:0} as Vec3D),
    // new Body("Mars", 6.4185e23, 6371000/2, {x:0, y:-227900000000} as Vec3D, {x:24100, y:0} as Vec3D),
    // new Body("Jupiter", 1898e24, 142984000/2, {x:0, y:-778500000000} as Vec3D, {x:13100, y:0} as Vec3D),
    // new Body("IO", 8.932e22,     1821300, {x:0, y:-778500000000 - 421700000} as Vec3D, {x:13100+17340, y:0} as Vec3D),
    // new Body("Europa", 4.8e22, 3100000/2, {x:0, y:-778500000000 - 670900000} as Vec3D, {x:13100+13743, y:0} as Vec3D),
    // new Body("Ganymede", 1.4819e23, 2634100, {x:0, y:-778500000000 - 1070400000} as Vec3D, {x:13100+10880, y:0} as Vec3D),

    // new Body("Callisto", 1.076e23,  2410000, {x:0, y:-778500000000 - 1882700000} as Vec3D, {x:13100+8204, y:0} as Vec3D),


    // new Body("Saturn", 568e24, 120536000/2, {x:0, y:-1432000000000} as Vec3D, {x:9700, y:0} as Vec3D),
    // new Body("Uranus", 86.8e24, 51118000/2, {x:0, y:-2867000000000} as Vec3D, {x:6800, y:0} as Vec3D),
    // new Body("Neptune", 102e24, 49528000/2, {x:0, y:  -4515000000000} as Vec3D, {x:5400, y:0} as Vec3D),
    // new Body("Pluto", 0.0130e24, 2376000/2, {x:0, y:-5906400000000} as Vec3D, {x:4700, y:0} as Vec3D),
  ],
  earth: 

  [
    new Body("Earth", 5.974e24, 12756000/2, {x:0, y:0} as Vec3D, {x:0, y:0} as Vec3D),
    new Body("ISS", 4.19e5, 108, {x: 12756000/2+410000, y:0} as Vec3D, {x:0, y: 7679} as Vec3D)
    ]
     
};


export { bodySystems as bodyGroups};

//   export default function build (systemIndex: number): Body[] {
//     // return new GravityAnimator(systems[systemIndex]);
//     return systems[systemIndex];
//   };


