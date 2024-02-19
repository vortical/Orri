
import { Mesh, Object3D } from 'three';
import { Body } from '../domain/Body.ts';
import { toRad } from '../system/geometry.ts';

// function getObject3DBuilder(body: Body): Object3DBuilder {

//     if(body.lightProperties){
//         return createStarObject3D;
//     }else{
//         return createPlanetObject3D;        
//     }
// }


abstract class BodyObject3D {

    // This is something for which we wrap a root mesh associated to a body and the body model.

    // update position
    // update sidernal rotation
    // update surface animations (we'd need to introduce and leverage LOD)


    object3D: Object3D;
    body: Body;

    constructor(body: Body){
        this.body = body;
        this.object3D = this.createObject3D(body)
        
    }

    abstract createObject3D(body: Body): Object3D;

    name(): string {
        return this.body.name;
    }

    scale(scale: number){
        this.object3D.scale.set(scale, scale, scale);
    }

    setBody(body: Body){
        this.body = body;
        // this.update();
    }

    update(){
        // this.body = body;

        const body = this.body;
    

    // static updateObject3D(body: Body, object3D: Object3D): Object3D {
        // position of the body's locality:
        this.object3D.position.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);

        // subclasses could have their own logic

        

        // this is the axis sideral rotation, we apply this to the 'surface' mesh
        
        this.object3D.children?.forEach((c => {
            c.rotation.set(body.sideralRotation.x, body.sideralRotation.y, body.sideralRotation.z);
            // each surface itself may have animations (e.g. atmosphere), so we should
            // call an update on those.

            // this would rotate the ring if we did not filter this out (only rotate the atmosphere).
            // regardless we need to create a model that represents our model
            if(c.children && c.children.length==1){
                if(c.children[0].userData?.type === "atmosphere"){
                   c.children[0].rotateY(toRad(0.02));
                }
            }
        }))

        return this;
        
    }    
}



// class PlanetaryBodyObject3D extends BodyObject3D{

//     static createObject3D(body: Body): Object3D {
//         const meshBuilder = getObject3DBuilder(body);
//         const object3D = meshBuilder(body);        
//         // body.object3D = object3D; // todo: side effect...
//         return object3D;
//     }
// }


export { BodyObject3D };












// see source at // https://threejs.org/examples/#misc_controls_fly for some interesting textures.

// todo: we can have this generated based on configuration of the body class
// const materials = {

//     sun: () => {

//         const textureLoader = new TextureLoader();
        // const texture = textureLoader.load('assets/textures/planets/sun.png');
        // texture.minFilter = NearestFilter;
        
        // const materiel = new MeshPhongMaterial({
        //     map: texture,
        //     lightMap: texture,
        //     transparent: true,
        //     opacity: 0.9
        //   });

        // return materiel;

//     },
//     atmosphere: () => {

//         const options = {
//             transmission: 1.0,
//             thickness: 0.1,
//             roughness: 0.1,
//         };
        
//         const textureLoader = new TextureLoader();
        
//         const material = new MeshPhysicalMaterial({
//             // map: textureLoader.load('https://clouds.matteason.co.uk/images/4096x2048/clouds.jpg'),
//             map: textureLoader.load('/assets/textures/planets/earth_clouds_2048.png'),
//             transmission: options.transmission,
//             thickness: options.thickness,
//             roughness: options.roughness,
//             clearcoat: 1.0,
//             clearcoatRoughness: 10.0,
//             specularIntensity:0.0005,
//             reflectivity: 1.0
//           });

//         return material;
//     },
//     earth: () => {
//         const textureLoader = new TextureLoader();
    
//         const texture = textureLoader.load('/assets/textures/planets/earth_atmos_2048.jpg');
//         texture.minFilter = NearestFilter;
//         const normal = textureLoader.load('/assets/textures/planets/earth_normal_2048.jpg');
//         normal.minFilter = LinearFilter;

//         const material = new MeshStandardMaterial({map: texture, normalMap: normal});
//         return material;        
//     },
//     moon: () => {
//             const textureLoader = new TextureLoader();
//             const texture = textureLoader.load('/assets/textures/planets/moon_1k.jpg');

//             texture.wrapS = ClampToEdgeWrapping;
//             texture.wrapT = ClampToEdgeWrapping;

//             const bump = textureLoader.load('/assets/textures/planets/moon_topo_1k.jpg');

//             bump.wrapS = ClampToEdgeWrapping;
//             bump.wrapT = ClampToEdgeWrapping;

//             const material = new MeshPhongMaterial({map: texture, bumpMap: bump});
//             return material;
//     },
//     default: (body?: Body) => () => {
//         const material = new MeshStandardMaterial({color: body?.color || "blue"});
//         return material;        
//     }
// // }
 
// const textureLoader = new TextureLoader();


// function createSunMaterial(materialProperties: MaterialProperties): Material {

//     const texture = materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined;

//     const materiel = new MeshPhongMaterial({
//         map: texture,
//         lightMap: texture,
//         transparent: true,
//         opacity: 0.9
//       });

//     return materiel;

// }
// function createBodySurfaceMaterial(materialProperties: MaterialProperties): Material {
    
//     const params: MeshPhongMaterialParameters = {
//         map: materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined,
//         normalMap: materialProperties.normalUri? textureLoader.load(materialProperties.normalUri) : undefined,
//         bumpMap: materialProperties.bumpMapUri? textureLoader.load(materialProperties.bumpMapUri) : undefined,
//         color: materialProperties.color 
//     }

//     const material = new MeshPhongMaterial(params);
//     return material;
// }




// body.mesh = mesh;

// abstract class BodyMeshCreator {
//     public abstract createBodyMesh(body: Body): Mesh;

// }


// class StarBodyMesh implements BodyMeshCreator {

   

// }

// class PlanetBodyMesh implements BodyMeshCreator{

//     private createAtmosphereMateriel(textureUri: string) {
    
//         const options = {
//             transmission: 1.0,
//             thickness: 0.1,
//             roughness: 0.1,
//         };
    
//         const material = new MeshPhysicalMaterial({
//             // map: textureLoader.load('https://clouds.matteason.co.uk/images/4096x2048/clouds.jpg'),
//             // map: textureLoader.load('/assets/textures/planets/earth_clouds_2048.png'),
//             map: textureLoader.load(textureUri),
//             transmission: options.transmission,
//             thickness: options.thickness,
//             roughness: options.roughness,
//             clearcoat: 1.0,
//             clearcoatRoughness: 10.0,
//             specularIntensity:0.0005,
//             reflectivity: 1.0
//           });
    
//         return material;
//     }
    
    
    // static createPlanetMesh(body: Body, materialProperties: MaterialProperties): Mesh {
    
    //     // {name="", radius = 1, material = materials.default(), rotation = new Vector3(0, 0, 0), position = new Vector3(0,0,0)} = {}
    
    //     const { name, radius, position } = body;
    
    //     // could use LOD...
    //     const widthSegements = 64;
    //     const heightSegments = 32;
    
    //     const geometry = new SphereGeometry(radius * lengthUnit, widthSegements, heightSegments);
    //     const material = createBodySurfaceMaterial(materialProperties);
    //     const surfacemesh = new Mesh(geometry, material);
    
    //     if (materialProperties.atmosphereUri) {
    //         const altitude = 10000 * lengthUnit; // 10 km
    //         const atmosphereMesh = new Mesh(
    //             new SphereGeometry(radius * lengthUnit + altitude, widthSegements, heightSegments),
    //             createAtmosphereMateriel(materialProperties.atmosphereUri)
    //         );
    //         surfacemesh.add(atmosphereMesh);
    //     }
    
    
    //     surfacemesh.name = name;
    
    //     surfacemesh.position.set(position.x * lengthUnit, position.y * lengthUnit, position.z * lengthUnit);
    //     // mesh.rotation.set(rotation.x, rotation.y, rotation.z); to do, this is the axis tilt on the orbital plane.
    //     return surfacemesh;
    // }
    


//     public createBodyMesh(body: Body): Mesh {


//         // const mesh = createSphere(
//         //     {
//         //         name: body.name,
//         //         // radius: body.radius / 1000, // the scene is in kms, but our body properties are in meters.
//         //         radius: body.radius / 1000,
//         //         material: materials[body.name.toLocaleLowerCase()] || materials.default(body), // for now
//         //         // we will have to calculate rotation/tilt also, but this is easy as its constant.
//         //         position: new Vector3(body.position.x, body.position.y, body.position.z).divideScalar(1000)
//         //     });
        
//         return mesh;
//     }

//     static updateMesh(body: Body, mesh: Mesh): Mesh {
//         mesh.position.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);
//         return mesh;
//     }
// }




// for orbits:
// // Create a sine-like wave
// const curve = new THREE.SplineCurve( [
// 	new THREE.Vector2( -10, 0 ),
// 	new THREE.Vector2( -5, 5 ),
// 	new THREE.Vector2( 0, 0 ),
// 	new THREE.Vector2( 5, -5 ),
// 	new THREE.Vector2( 10, 0 )
// ] );

// const points = curve.getPoints( 50 );
// const geometry = new THREE.BufferGeometry().setFromPoints( points );

// const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );

// // Create the final object to add to the scene
// const splineObject = new THREE.Line( geometry, material );