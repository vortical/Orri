
import { Group, Object3D } from 'three';
import { Body } from '../domain/Body.ts';
import { toRad } from '../system/geometry.ts';
import { BodySystem, CameraLayer} from '../scene/BodySystem.ts';

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { throttle } from '../system/timing.ts';



// const NAME_LABEL_LAYER=1;
// const INFO_LABEL_LAYER=2;



abstract class BodyObject3D {
    object3D: Object3D;
    body: Body;
    bodySystem: BodySystem;
    labels: ObjectLabels;

    constructor(body: Body, bodySystem: BodySystem){
        this.body = body;
        this.bodySystem = bodySystem;
        this.object3D = new Group();
        this.labels = createLabel(this);
        this.object3D.add(this.labels.name, this.labels.info);

    }


    getName(): string {
        return this.body.name;
    }

    scale(scale: number){
        this.object3D.scale.set(scale, scale, scale);
    }

    setBody(body: Body){
        this.body = body;
    }

    // getObject3D(): Object3D {
    //     if(this.object3D === undefined){
    //         this.object3D = this.createObject3D(this.body);
    //     }
    //     return this.object3D;
        
    // }

    /**
     * Calling this after making changes to the underlying body properties
     * will update the 3d properties of the Obect3D
     */
    update(): void {
        const body = this.body;
        this.object3D.position.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);

        this.object3D.children?.forEach((c => {
            c.rotation.set(body.sideralRotation.x, body.sideralRotation.y, body.sideralRotation.z);
            // each surface itself may have animations (e.g. atmosphere), so we should
            // call an update on those.
            // this would rotate the ring if we did not filter this out (only rotate the atmosphere).
            // regardless we need to create a model that represents our model
            if(c.children && c.children.length==1){
                if(c.children[0].userData?.type === "atmosphere"){
                    // fake this for now
                   c.children[0].rotateY(toRad(0.0015));
                }
            }
        }));
       
        this.updateLabels();
        
    }
    
    /**
     * Throttle this to 5 times a second, else it would be updated
     * for every frame.
     */
    updateLabels = throttle(200, this, () => {
        if(this.bodySystem.isLayerEnabled(CameraLayer.InfoLabel)){
            this.labels.info.element.textContent = formatNumber(this.distanceFromCamera()).concat(" km");
        }
    });

    distanceFromCamera(): number {
        return this.bodySystem.camera.position.distanceTo(this.object3D.position);
    }

}


type ObjectLabels = {
    name: CSS2DObject, 
    info: CSS2DObject
};

function formatNumber(n: number): string {
    return Math.trunc(n).toLocaleString();

}

function createLabel(bodyObject3D: BodyObject3D): ObjectLabels{
    const bodyNameDiv = document.createElement( 'div' );
    bodyNameDiv.className = 'label';
    bodyNameDiv.textContent = bodyObject3D.getName();
    bodyNameDiv.style.backgroundColor = 'transparent';

    const bodyInfoDiv = document.createElement( 'div' );
    bodyInfoDiv.className = 'infolabel';
    bodyInfoDiv.textContent = formatNumber(bodyObject3D.distanceFromCamera()).concat(" km");
    bodyInfoDiv.style.backgroundColor = 'transparent';

    const objectNameLabel = new CSS2DObject( bodyNameDiv );
    objectNameLabel.center.set( 0, 1 );
    objectNameLabel.layers.set( CameraLayer.NameLabel);

    const objectInfoLabel = new CSS2DObject( bodyInfoDiv );
    objectInfoLabel.center.set( 0, 0);
    objectInfoLabel.layers.set( CameraLayer.InfoLabel);

    return {name: objectNameLabel, info: objectInfoLabel};

}
export { BodyObject3D };