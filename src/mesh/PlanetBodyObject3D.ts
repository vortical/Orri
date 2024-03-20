import { Body } from '../domain/Body.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, TextureLoader, SphereGeometry, MeshPhongMaterialParameters, MeshPhongMaterial, Object3D, RingGeometry, MeshLambertMaterial, DoubleSide, Vector3, Quaternion, IcosahedronGeometry, Group, FrontSide, BackSide, Vector2, LineBasicMaterial, MeshBasicMaterial, Sphere, Spherical } from "three";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';
import { BodyObject3D } from './BodyObject3D.ts';
import { MaterialProperties } from '../domain/models.ts';
import { BodySystem } from '../scene/BodySystem.ts';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { toRad } from '../system/geometry.ts';


const textureLoader = new TextureLoader();

function createAtmosphereMateriel(textureUri: string) {
    return new MeshPhongMaterial({
        map: textureLoader.load(textureUri),
        transparent: true,
        opacity: 0.9
    })
}

function createBodySurfaceMaterial(materialProperties: MaterialProperties): Material {

    const params: MeshPhongMaterialParameters = {}

    if (materialProperties.textureUri) {
        params.map = textureLoader.load(materialProperties.textureUri);
    }

    if (materialProperties.normalUri) {
        params.normalMap = textureLoader.load(materialProperties.normalUri);
    }

    if (materialProperties.bumpMapUri) {
        params.bumpMap = textureLoader.load(materialProperties.bumpMapUri);
        params.bumpScale = materialProperties.bumpMapScale || 1;
    }

    if (materialProperties.specularMapUri) {
        params.specularMap = textureLoader.load(materialProperties.specularMapUri);
    }

    if (materialProperties.color) {
        params.color = materialProperties.color;
    }

    return new MeshPhongMaterial(params);
}


function createRingMeshes(body: Body): Mesh[] | undefined {
    // we support rings with parts with different rotational periods, but need to generate imagery for this.
    // https://astronomy.stackexchange.com/questions/25405/what-are-the-periods-of-saturns-rings
    // https://en.wikipedia.org/wiki/Rings_of_Saturn#Major_subdivisions

    /**
     * Map texture UV based on distance from center
     * 
     * @param mesh 
     * @param midpoint 
     * @returns 
     */
    function adjustTextureUV(mesh: Mesh, midpoint: number): Mesh {
        const positions = mesh.geometry.attributes.position;
        let verticePosition = new Vector3();
        const angle = new Vector3(1, 0, 0);

        for (let i = 0; i < positions.count; i++) {
            verticePosition.fromBufferAttribute(positions, i);
            const verticeAngle = verticePosition.angleTo(angle);
            const distanceFromCenter = verticePosition.fromBufferAttribute(positions, i).length();
            mesh.geometry.attributes.uv.setXY(i, Math.abs(distanceFromCenter) < midpoint ? 0 : 1, verticeAngle / Math.PI);
        }
        return mesh;
    }

    return body.rings?.map((r) => {
        const geometry = new RingGeometry(
            r.minRadius / 1000,
            r.maxRadius / 1000,
            128
        );

        const colorMap = textureLoader.load(r.colorMapUri!);
        const alphaMap = textureLoader.load(r.alphaMapUri!);
        const material = new MeshLambertMaterial({
            map: colorMap,
            alphaMap: alphaMap,
            transparent: true,
            opacity: r.opacity,
            side: DoubleSide,
            wireframe: false
        });

        const mesh = new Mesh(geometry, material);
        return adjustTextureUV(mesh, (r.minRadius / 1000 + r.maxRadius / 1000) / 2);
    });
}

class PlanetaryBodyObject3D extends BodyObject3D {

    surfaceMesh: Mesh;


    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);

        const materialProperties = meshProperties.solarSystem.find((b) => b.name.toLocaleLowerCase() == body.name.toLowerCase())!;
        const widthSegements = 64;
        const heightSegments = 64;


        // TODO: consider having a radius like
        // const radiusX = body.dimensions[0];
        // const radiusZ = body.dimensions[1];
        // const radiusY = body.dimensions[2];

        // const yScale = ry / rx;
        // const zScale = rz / rx;

        //
        // const geometry = SphereGeometry(rx, 24, 24);
        // geometry.scale(1, yScale, zScale);
        // geometry.rotateX(Math.PI / 2);

        const geometry = new SphereGeometry(body.radius * SCENE_LENGTH_UNIT_FACTOR, widthSegements, heightSegments);
        const material = createBodySurfaceMaterial(materialProperties);
        const surfacemesh = new Mesh(geometry, material);


        if (materialProperties.atmosphereUri) {
            const altitude = 15; //  km
            const atmosphereMesh = new Mesh(
                new SphereGeometry(body.radius * SCENE_LENGTH_UNIT_FACTOR + altitude, widthSegements, heightSegments),
                createAtmosphereMateriel(materialProperties.atmosphereUri)
            );
            // hack hack...  
            //todo: reference the body object 3D into 'parts', not just three.js 3d objects with user data to identify them.
            // e.g.: atmosphere, surface (roads etc...) 
            atmosphereMesh.userData = { type: "atmosphere" };

            atmosphereMesh.receiveShadow = body.receiveShadow;
            atmosphereMesh.castShadow = body.castShadow;
            surfacemesh.add(atmosphereMesh);
        }

        // todo: give the name to the bodyMesh Object
        surfacemesh.name = body.name;
        const ringMeshes = createRingMeshes(body);
        const bodymesh = this.object3D;
        const axis = body.getAxisDirection();
        bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(axis.x, axis.y, axis.z)));
        surfacemesh.receiveShadow = body.receiveShadow;
        surfacemesh.castShadow = body.castShadow;
        bodymesh.add(surfacemesh);
        this.surfaceMesh = surfacemesh;

        // yuck:
        ringMeshes?.forEach((ringMesh) => surfacemesh.add(ringMesh))
        ringMeshes?.forEach((ringMesh) => ringMesh.rotation.set(-Math.PI / 2, 0, 0));
    }

    getSurfaceMesh(): Mesh {
        return this.surfaceMesh;
    }

    update(): void {
        super.update();
    }

}

export { PlanetaryBodyObject3D };