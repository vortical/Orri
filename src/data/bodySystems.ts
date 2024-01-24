    
import { Body }  from '../body/Body';
import { Vec3D } from '../system/vecs';


// {
//   name: "",
//   textureUri: "",
//   bumpMapUri: "",
//   normalUri: "",
//   atmosphereUri: ""

// }


//https://planet-texture-maps.fandom.com/wiki/Callisto
const meshProperties = {
  solarSystem: [
    {
      name: "Sun",
      textureUri: "/assets/textures/planets/sun.png",
      alphaUri:"/assets/textures/planets/sun_alpha.jpg"
    },
    {
      name: "Earth",
      textureUri: "/assets/textures/planets/earth_atmos_2048.jpg",
      normalUri: "/assets/textures/planets/earth_normal_2048.jpg",
      atmosphereUri: "/assets/textures/planets/earth_clouds_2048.png"
    },
    {
      name: "moon",
      textureUri: "/assets/textures/planets/moon_1k.jpg",
      bumpMapUri: "/assets/textures/planets/moon_topo_1k.jpg",
    },
    {
      name: "Mercury",
      textureUri: "/assets/textures/planets/mercury.jpg",
      bumpMapUri: "/assets/textures/planets/moon_topo.jpg",
    
    },
    {
      name: "Venus",
      textureUri: "/assets/textures/planets/venus.jpg",
      bumpMapUri: "/assets/textures/planets/venus_topo.jpg",
    
    },
    {
      name: "Mars",
      textureUri: "/assets/textures/planets/mars_1k.jpg",
      bumpMapUri: "/assets/textures/planets/mars_topo_1k.jpg",
    },
    {
      name: "Jupiter",
      textureUri: "/assets/textures/planets/jupiter_4k.jpg",
    },    
    {
      name: "Io",
      textureUri: "/assets/textures/planets/io.jpg",
    },        
    {
      name: "Saturn",
      textureUri: "/assets/textures/planets/saturn_2k.jpg",
    },    
    {
      name: "Uranus",
      textureUri: "/assets/textures/planets/uranus.jpg",
    },    
    {
      name: "Neptune",
      textureUri: "/assets/textures/planets/neptune.jpg",
    },        
    {
      name: "Pluto",
      textureUri: "/assets/textures/planets/pluto_2k.jpg",
      bumpMapUri: "/assets/textures/planets/pluto_topo_2k.jpg",      
    },        


  ]

}
// 2 sets of bodies:
// solarsystem: includes all planets (+ earth's moon)
// earth: just earth and satellites (just ISS for now)
//https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html

// todo: convert this json and fetch it...
const bodySets = {
    solarSystem:
   [
    new Body({ 
      name:"Sun", 
      mass: 1.989e30, 
      radius: 696.34e6, 
      position: {x:0, y:0, z:0} as Vec3D, 
      speed: {x:0, y:0, z:0} as Vec3D, 
      obliquityToOrbit: 7.25,
      // sun has 'differential rotation'; 25 days at equator, 35 days at highter latitudes
      sideralRotationPeriod: 25 * (24*3600),
      lightProperties:{}
    }),
/*    new Body({
      name: "Mercury", 
      mass: 3.3022e23, 
      radius: 2.44e6,  
      position: {x:57900000e3, y:0, z:0} as Vec3D,
      speed: {x:0, y:0,z:-47400} as Vec3D, 
      color: "green"
    }),
    
    new Body({
      name: "Venus",   
      mass: 4.869e24,  
      radius: 6.05e6,  
      position: {x:0, y:0, z:108200000e3} as Vec3D, 
      speed: {x:35020, y:0, z:0} as Vec3D, 
      color: "red"
    }),
 */
    new Body({
      name:"Earth", 
      mass: 5.9736e24, 
      radius: 6.378e6, 
      position: {x:-149597871e3, y:0, z:0} as Vec3D,       
      speed: {x:0, y: 0, z: 29780} as Vec3D,
      orbitInclination: 0, // this can be determined by the speed vectors. But if speed is given in as a scalar and we need to convert to a vector, then we can use this inclination to calculate the speed.
      obliquityToOrbit: 23.44,
      sideralRotationPeriod: (23*3600 + 56*60 + 4.09)
    }),
    // new Body("ISS", 4.19e5, 108, {x: -149597871e3+12756000/2+410e3, y:0} as Vec3D, {x:0, y: -29800+7679} as Vec3D ),

    //Orbital parameters (for orbit about the Earth)
//    Moon   
// Semimajor axis (106 km)	0.3844
// Perigee (106 km)*	0.3633
// Apogee (106 km)*	0.4055
// Revolution period (days)	27.3217
// Synodic period (days)	29.53
// Mean orbital velocity (km/s)	1.022
// Max. orbital velocity (km/s)	1.082
// Min. orbital velocity (km/s)	0.970
// Inclination to ecliptic (deg)	5.145
// Inclination to Earth equator (deg)	18.28 - 28.58
// Orbit eccentricity	0.0549
// Sidereal rotation period (hrs)	655.720
// Obliquity to orbit (deg)	6.68
// Recession rate from Earth (cm/yr)	3.8

    new Body({
      name: "Moon", 
      mass: 7.3477e22, 
      radius: 1.737400e6, 
      position: {x: -149597871e3+384.400e6, y:0, z:0} as Vec3D, 
      //moon revolves counterclockwise around Earth.
      speed: {x:0, y: 0, z: 29780 - 1023.16} as Vec3D,

      orbitInclination:5.145, // we use this to calculate the z speed. 
      //obliquityToOrbit: 1.5424,
      obliquityToOrbit: 1.5424,
      // we'd need an initial rotation angle when starting.
      sideralRotationPeriod: 27.3217 * (24 * 3600)
    }),

    // new Body({
    //   name: "Mars", 
    //   mass: 6.4185e23, 
    //   radius: 3.185500e6, 
    //   position: {x:0, y:0, z:-227900000000} as Vec3D, 
    //   speed: {x:-24100, y:0, z:0} as Vec3D, 
    //   // color: "purple"
    // }),
    // new Body({
    //   name: "Jupiter", 
    //   mass: 1898e24, 
    //   radius: 142.984e6/2, 
    //   position: {x:-778500000000, y:0, z:0} as Vec3D, 
    //   speed: {x:0, y:0, z:13100} as Vec3D, 
    // }),      
    // new Body({
    //   name:"Io", 
    //   mass: 8.932e22,
    //   radius:1.8213e6, 
    //   position: {x:-778500000000 - 421700000, y:0, z:0} as Vec3D, 
    //   speed: {x:0, y:0, z:13100+17340} as Vec3D
    // }),


    // new Body({
    //   name: "Saturn", 
    //   mass: 568e24, 
    //   radius: 120.536e6/2, 
    //   position: {x:0, y:0, z:-1432000000000} as Vec3D, 
    //   speed: {x:-9700, y:0, z:0} as Vec3D, 
    // }),
    // new Body({
    //   name: "Uranus", 
    //   mass: 86.8e24, 
    //   radius: 51.118e6/2,
    //   position: {x:-2867000000000, y:0, z:0} as Vec3D, 
    //   speed: {x:0, y:0, z:6800} as Vec3D
    // }),
    // new Body({
    //   name:"Neptune", 
    //   mass:102e24, 
    //   radius: 49.528e6/2, 
    //   position:{x:0, y:0, z: 4515000000000} as Vec3D, 
    //   speed:{x:5400, y:0,z:0} as Vec3D
    // }),
    // new Body({
    //   name: "Pluto", 
    //   mass: 0.0130e24, 
    //   radius: 2.376e6/2, 
    //   position:{x:5906400000000, y:0, z:0} as Vec3D, 
    //   speed:{x:0, y:0, z:- 4700} as Vec3D
    // }),        
                                
    // new Body("Jupiter", 1898e24, 142984000/2, {x:0, y:-778500000000} as Vec3D, {x:13100, y:0} as Vec3D, "orange"),
    // new Body("IO", 8.932e22,     1821300, {x:0, y:-778500000000 - 421700000} as Vec3D, {x:13100+17340, y:0} as Vec3D, "pink"),
    // new Body("Europa", 4.8e22, 3100000/2, {x:0, y:-778500000000 - 670900000} as Vec3D, {x:13100+13743, y:0} as Vec3D, "orange"),
    // new Body("Ganymede", 1.4819e23, 2634100, {x:0, y:-778500000000 - 1070400000} as Vec3D, {x:13100+10880, y:0} as Vec3D, "cyan"),

    // new Body("Callisto", 1.076e23,  2410000, {x:0, y:-778500000000 - 1882700000} as Vec3D, {x:13100+8204, y:0} as Vec3D),


    // new Body("Saturn", 568e24, 120536000/2, {x:0, y:-1432000000000} as Vec3D, {x:9700, y:0} as Vec3D),
    // new Body("Uranus", 86.8e24, 51118000/2, {x:0, y:-2867000000000} as Vec3D, {x:6800, y:0} as Vec3D),
    // new Body("Neptune", 102e24, 49528000/2, {x:0, y:  -4515000000000} as Vec3D, {x:5400, y:0} as Vec3D),
    // new Body("Pluto", 0.0130e24, 2376000/2, {x:0, y:-5906400000000} as Vec3D, {x:4700, y:0} as Vec3D),
  ]
  // ,
  // earth: 

  // [
  //   new Body("Earth", 5.974e24, 12756000/2, {x:0, y:0} as Vec3D, {x:0, y:0} as Vec3D, "blue"),

  //   new Body("ISS", 4.19e5, 108, {x: 12756000/2+410000, y:0} as Vec3D, {x:0, y: 7679} as Vec3D, "white")
  //   ]
     
};

// todo: make this a datasource...



export { bodySets, meshProperties};

//   export default function build (systemIndex: number): Body[] {
//     // return new GravityAnimator(systems[systemIndex]);
//     return systems[systemIndex];
//   };


