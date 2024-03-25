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
      atmosphereUri: "/assets/textures/planets/earth_clouds_2048.png"
    },
    // https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=4720
        
    {
      name: "moon",
      textureUri: "/assets/textures/planets/moon_map_4k.jpg",
     bumpMapUri: "/assets/textures/planets/moon_bump.jpg",
     bumpMapScale: 3

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
      normalMapScale: 2,
    },
    {
      name: "Jupiter",
      textureUri: "/assets/textures/planets/jupiter_4k.jpg",
    },    
    {
      name: "Io",
      textureUri: "/assets/textures/planets/io.jpg",
      normalUri: "/assets/textures/planets/io_normal.jpg",
      normalMapScale: 1,
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