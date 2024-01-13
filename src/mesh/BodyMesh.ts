
import { Body } from '../body/Body.ts';
import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, TextureLoader, Vector3 } from "three";



const materials = {

    atmosphere: () => {

        const options = {
            transmission: 1.0,
            thickness: 0.1,
            roughness: 0.1,
          };
        const textureLoader = new TextureLoader();
        
        const material = new MeshPhysicalMaterial({
            // map: textureLoader.load('https://clouds.matteason.co.uk/images/4096x2048/clouds.jpg'),
            map: textureLoader.load('public/assets/textures/planets/earth_clouds_2048.png'),
            transmission: options.transmission,
            thickness: options.thickness,
            roughness: options.roughness,
            clearcoat: 1.0,
            clearcoatRoughness: 10.0,
            specularIntensity:0.0005,
            reflectivity: 1.0
          });

        return material;
    },
    earth: () => {
        const textureLoader = new TextureLoader();
    
        const texture = textureLoader.load('/assets/textures/planets/earth_atmos_2048.jpg');
        const normal = textureLoader.load('/assets/textures/planets/earth_normal_2048.jpg');
        const material = new MeshStandardMaterial({map: texture, normalMap: normal});
        return material;        
    },
    moon: () => {
            const textureLoader = new TextureLoader();
            const texture = textureLoader.load('/assets/textures/planets/moon_1024.jpg');
            const material = new MeshStandardMaterial({map: texture});
            return material;
    },
    default: () => {
        const material = new MeshStandardMaterial({color: 'blue'});
        return material;        
    }
}
 
function createSphere({name="", radius = 1, material = materials.default, rotation = new Vector3(0, 0, 0), position = new Vector3(0,0,0)} = {}): Mesh {
    // could use LOD...
    const widthSegements = 64;
    const heightSegments = 32;
    const geometry = new SphereGeometry(radius, widthSegements, heightSegments);
    const mesh = new Mesh(geometry, material());
    mesh.name = name;

    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    
    return mesh;
}


class BodyMesh {
    static createBodyMesh(body: Body) {
        const mesh = createSphere(
            {
                name: body.name,
                // radius: body.radius / 1000, // the scene is in kms, but our body properties are in meters.
                radius: body.radius / 20,
                material: materials.default, // for now
                // we will have to calculate rotation also, but this is easy as its constant.
                position: new Vector3(body.position.x, body.position.y, body.position.z).divideScalar(1000)
            });
        // hmm, liking ts even more :(    
        body.mesh = mesh;

        return mesh;
    }

    static updateMesh(body: Body, mesh: Mesh): Mesh {
        mesh.position.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);
        return mesh;
    }
}

export { BodyMesh, materials };