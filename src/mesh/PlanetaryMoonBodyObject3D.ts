import { BodySystem, CameraLayer } from "../scene/BodySystem";
import { PlanetaryBodyObject3D } from "./PlanetBodyObject3D";
import { Body } from '../domain/Body.ts';



export class PlanetaryMoonBodyObject3D extends PlanetaryBodyObject3D {

    constructor(body: Body, bodySystem: BodySystem){
        super(body, bodySystem);
    }

    updateLabels(){

        // we only show moon/satellite labels if this moon's planetarySystem is selected else from a distance they are all in the same 
        // area and unreadable
                
        if(this.bodySystem.isLayerEnabled(CameraLayer.InfoLabel) || this.bodySystem.isLayerEnabled(CameraLayer.NameLabel)){
            const currentTarget = this.bodySystem.getBodyObject3DTarget();

            // busyness as usual!
            if(this.body.planetarySystem() == currentTarget.body.planetarySystem()){
                this.labels.name.element.textContent = this.getName();
                super.updateLabels();
            } else {
                
                if(this.bodySystem.isLayerEnabled(CameraLayer.NameLabel)){
                    this.labels.name.element.textContent = "";
                }
                if(this.bodySystem.isLayerEnabled(CameraLayer.InfoLabel)){
                    this.labels.info.element.textContent = "";
                }                
            }
        }

    };

}