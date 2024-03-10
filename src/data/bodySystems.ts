    
import { Quaternion, Vector3 } from 'three';
import { Body }  from '../domain/Body.ts';
import { Vector } from '../system/vecs';
import { toRad } from '../system/geometry';
// import { createBodies } from "../body/builders.ts";
import { KinematicObject } from '../domain/models.ts';


//https://planet-texture-maps.fandom.com/wiki/Callisto
// move this to the server, this will be served up

// would be nice to be able to have various resolutions that can be pulled

const meshProperties = {
  solarSystem: [
    {
      name: "Sun",
      textureUri: "/assets/textures/planets/sun.png",
      alphaUri:"/assets/textures/planets/sun_alpha.jpg"
    },
    {
      name: "Earth",
      textureUri: "/assets/textures/planets/earthmap4k.jpg",
      bumpMapUri: "/assets/textures/planets/earthbump4k.jpg",
      specularMapUri: "/assets/textures/planets/earthspec4k.jpg",
      
      // textureUri: "/assets/textures/planets/8081_earthmap10k.jpg",
      

      // textureUri: "/assets/textures/planets/earth_atmos_2048.jpg",
      
      // normalUri: "/assets/textures/planets/earth_normal_2048.jpg",
      atmosphereUri: "/assets/textures/planets/earth_clouds_2048.png",
      // specularMapUri: "/assets/textures/planets/earth_specular_2048.jpg"
    },
    {
      name: "moon",
      textureUri: "/assets/textures/planets/moonmap4k.jpg",
      bumpMapUri: "/assets/textures/planets/moonbump4k.jpg",
      // textureUri: "/assets/textures/planets/moon_1k.jpg",
      // bumpMapUri: "/assets/textures/planets/moon_topo_1k.jpg",
    },
    {
      name: "Mercury",
      textureUri: "/assets/textures/planets/mercurymap.jpg",
      bumpMapUri: "/assets/textures/planets/mercurybump.jpg",
    
    },
    {
      name: "Venus",
      textureUri: "/assets/textures/planets/venus.jpg",
      bumpMapUri: "/assets/textures/planets/venus_topo.jpg",
    
    },
    {
      name: "Mars",
      textureUri: "/assets/textures/planets/mars_2k_color.jpg",
      normalUri: "/assets/textures/planets/mars_2k_normal.jpg",

    },
    {
      name: "Jupiter",
      textureUri: "/assets/textures/planets/jupiter_4k.jpg",
    },    
    {
      name: "Io",
      textureUri: "/assets/textures/planets/io.jpg",
      normalUri: "/assets/textures/planets/io_1_normal.jpg",
    },        

    {
      name: "Europa",
      textureUri: "/assets/textures/planets/europa.jpg",
      bumpMapUri: "/assets/textures/planets/europa_topo.jpg",
    },        
    {
      name: "Ganymede",
      textureUri: "/assets/textures/planets/ganymede.jpg",
    },        

    {
      name: "Callisto",
      textureUri: "/assets/textures/planets/callisto.jpg",
    },        


    {
      name: "Saturn",
      textureUri: "/assets/textures/planets/saturn_cassini_2011_texture_map.jpg"
      
      
    },    

    {
      name: "Uranus",
      textureUri: "/assets/textures/planets/uranus_color.jpg",
      normalUri: "/assets/textures/planets/uranus_norm.jpg",
      bumpMapUri: "/assets/textures/planets/uranus_bw.jpg",
    },    

    // {
    //   name: "Uranus",
    //   textureUri: "/assets/textures/planets/uranus.jpg",
    // },    
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

export { meshProperties };