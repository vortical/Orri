import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { LatLon } from "../system/LatLon.ts";
import { Body } from '../domain/Body.ts';
import { BodyObject3D } from "./BodyObject3D.ts";
import { Vector } from "../system/Vector.ts";
import { BodyAxes } from "../system/geometry.ts";


export class LocationPin {
    mesh: Mesh;
    bodyObject3D: BodyObject3D;
    color: string;
    latlon: LatLon;
    isVisible: boolean;
    name: string;
    north: Vector;


    constructor(latlon: LatLon, bodyObject3D: BodyObject3D, color: string, name: string, isVisible: boolean = true, elevation: number = 100) {
        function createBodyPinMesh() {
            const pinRadius = 20;
            const geometry = new SphereGeometry(pinRadius, 5, 5);
            const materiel = new MeshBasicMaterial({ color: color });
            const mesh = new Mesh(geometry, materiel);
            const spherical = latlon.toSpherical((bodyObject3D.body.radius + elevation) / 1000);
            
            

            mesh.position.setFromSpherical(spherical);
            return mesh;
        }
        this.name = name;
        this.latlon = latlon;
        this.north = new Vector(0,0,0); 
        this.mesh = createBodyPinMesh()
        this.bodyObject3D = bodyObject3D;
        this.color = color;
        this.isVisible = isVisible;
        this.mesh.visible = isVisible;
        bodyObject3D.addLocationPin(this);
    }

    /**
     * A pin has a plane normal.
     * 
     * 
     * @returns The Up vector of pin, which represents the pin's plane normal.
     */
    getLocationPinNormal(): Vector3 {
        const pinPosition = this.getMesh().getWorldPosition(new Vector3());
        const centerBodyPosition = this.bodyObject3D.getSurfaceMesh().getWorldPosition(new Vector3());
        return pinPosition.sub(centerBodyPosition).normalize();
    }

    /**
     * 2 axes on a pin to determine its orientation. 
     * 
     * @returns The pin's local coordinate axes. 
     */
    getAxes(): BodyAxes {
        const north = this.bodyObject3D.getNorthAxis();        
        const up = this.getLocationPinNormal();
        const east = new Vector().crossVectors(north, up);
        return {up: up, east: east};
    }


    /**
     * 
     * @param vector Representing the position of the pin in the world (ICRF frame)
     * @returns 
     */
    getLocationPinWorldPosition(vector = new Vector3()): Vector3 {
        return this.getMesh().getWorldPosition(vector);
    }

    getMesh(): Mesh {
        return this.mesh;
    }

    remove() {
        this.bodyObject3D.removeLocationPin(this);
        this.mesh.geometry.dispose();
    }
}