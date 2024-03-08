import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { LatLon } from "../system/geometry";
import { Body } from '../domain/Body.ts';
import { BodyObject3D } from "./BodyObject3D.ts";
import { CameraMode } from "../scene/BodySystem.ts";

export class LocationPin {
    mesh: Mesh;
    bodyObject3D: BodyObject3D;
    color: string;
    latlon: LatLon;

    constructor(latlon: LatLon, bodyObject3D: BodyObject3D, color: string){        
        function createBodyPinMesh() {
            const pinRadius = 20; 
            const geometry = new SphereGeometry(pinRadius, 18, 18);
            const materiel = new MeshBasicMaterial({color: color});
            const mesh = new Mesh(geometry, materiel);
            mesh.position.setFromSpherical(latlon.toSpherical(bodyObject3D.body.radius/1000));            
            return mesh;
        }        
        this.latlon = latlon;
        this.mesh = createBodyPinMesh()
        this.bodyObject3D = bodyObject3D;
        this.color = color;
        bodyObject3D.addLocationPin(this);
    }


    getLocationPinNormal(): Vector3 {
        const pinPosition = this.getMesh().getWorldPosition(new Vector3());
        const centerBodyPosition = this.bodyObject3D.getSurfaceMesh().getWorldPosition(new Vector3());
        return pinPosition.sub(centerBodyPosition).normalize();
    }

    getLocationPinWorldPosition(vector = new Vector3()): Vector3 {
        return this.getMesh().getWorldPosition(vector);
    }


    getMesh(): Mesh {
        return this.mesh;
    }

    remove(){
        this.bodyObject3D.removeLocationPin(this);
    }

}