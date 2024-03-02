import { Group, Object3D } from 'three';
import { Body } from '../domain/Body.ts';
import { toRad } from '../system/geometry.ts';
import { BodySystem, CameraLayer } from '../scene/BodySystem.ts';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { throttle } from '../system/timing.ts';





class ObjectLabels{
    objectNameLabel: CSS2DObject;
    objectInfoLabel: CSS2DObject;
    bodyObject3D: BodyObject3D;

    constructor(bodyObject3D: BodyObject3D){
        this.objectNameLabel = ObjectLabels.#createLabel(1, bodyObject3D.getName(),CameraLayer.NameLabel);
        this.objectInfoLabel = ObjectLabels.#createLabel(0, formatNumber(bodyObject3D.distanceFromCamera()).concat(" km"), CameraLayer.InfoLabel);

        this.bodyObject3D = bodyObject3D;
        this.setupLabelClickHandler();
    }

    static #createLabel(center: number, textContent: string, layer: CameraLayer):CSS2DObject {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'label';
        elementDiv.textContent = textContent;
        elementDiv.style.backgroundColor = 'transparent';
        const label = new CSS2DObject(elementDiv);
        label.center.set(0, center);
        label.layers.set(layer);
        return label;
    }

    setupLabelClickHandler(){
        const handler = () => {
            console.log("Set as target: "+this.bodyObject3D.getName());
            // this.bodyObject3D.setAsTarget();
        };
    
        this.objectNameLabel.element.addEventListener("pointerdown", handler);
        this.objectInfoLabel.element.addEventListener("pointerdown", handler);
    
    }

    getLabels(): CSS2DObject[]{
        return [this.objectNameLabel, this.objectInfoLabel];
    }
    
    // #createLabel(center: number, layer: CameraLayer) {
    //     const bodyNameDiv = document.createElement('div');
    //     bodyNameDiv.className = 'label';
    //     bodyNameDiv.textContent = this.bodyObject3D.getName();
    //     bodyNameDiv.style.backgroundColor = 'transparent';
    
    //     const bodyInfoDiv = document.createElement('div');
    //     bodyInfoDiv.className = 'label';
    //     bodyInfoDiv.textContent = formatNumber(this.bodyObject3D.distanceFromCamera()).concat(" km");
    //     bodyInfoDiv.style.backgroundColor = 'transparent';
    
    //     const objectNameLabel = new CSS2DObject(bodyNameDiv);
    //     objectNameLabel.center.set(0, 1);
    //     objectNameLabel.layers.set(CameraLayer.NameLabel);
    
    //     const objectInfoLabel = new CSS2DObject(bodyInfoDiv);
    //     objectInfoLabel.center.set(0, 0);
    //     objectInfoLabel.layers.set(CameraLayer.InfoLabel);
    // }
    
    //     listenForClick(bodyNameDiv);
    
    //     return { name: objectNameLabel, info: objectInfoLabel };

    // setupEventHandlers(){

    //     const handler = () => {
    //         console.log("Set as target: "+this.bodyObject3D.getName());
    //         // this.bodyObject3D.setAsTarget();
    //     };

    //     this.name.element.addEventListener("pointerdown", handler);
    //     this.info.element.addEventListener("pointerdown", handler);
    // }
}


// function listenForClick(element: HTMLElement){

//     element.addEventListener("pointerdown", (event) => {
//         console.log("click");
//     });
    
//     }

// }


abstract class BodyObject3D {
    object3D: Object3D;
    body: Body;
    bodySystem: BodySystem;
    labels: ObjectLabels;

    constructor(body: Body, bodySystem: BodySystem) {
        this.body = body;
        this.bodySystem = bodySystem;
        this.object3D = new Group();
        this.labels = new ObjectLabels(this);
        this.object3D.add(...this.labels.getLabels());
    }

    getName(): string {
        return this.body.name;
    }

    scale(scale: number) {
        this.object3D.scale.set(scale, scale, scale);
    }

    setBody(body: Body) {
        this.body = body;
    }

    setAsTarget(){
        this.bodySystem.setTarget(this.body);
    }

    /**
     * Calling this after making changes to the underlying body properties
     * will update the 3d properties of the Obect3D
     */
    update(): void {
        const body = this.body;
        this.object3D.position.set(body.position.x / 1000, body.position.y / 1000, body.position.z / 1000);

        this.object3D.children?.forEach((c => {
            c.rotation.set(body.sideralRotation.x, body.sideralRotation.y, body.sideralRotation.z);
            // each surface itself may have animations (e.g. atmosphere), so we should
            // call an update on those.
            // this would rotate the ring if we did not filter this out (only rotate the atmosphere).
            // regardless we need to create a model that represents our model
            if (c.children && c.children.length == 1) {
                if (c.children[0].userData?.type === "atmosphere") {
                    // fake this for now
                    c.children[0].rotateY(toRad(0.0015));
                }
            }
        }));
        this.updateLabelsInvoker();
    }
    /**
     * Limit the label updates to 10 per second.
     */
    updateLabelsInvoker = throttle(100, this, () => this.updateLabels());

    updateLabels() {
        // we only show moon/satellite labels if the that system is selected else from a distance they are all in the same 
        // area and unreadable
        const currentTarget = this.bodySystem.getBodyObject3DTarget();

        if (this.body.planetarySystem() == currentTarget.body.planetarySystem()) {
            // set the label class style as selected
            if (this.bodySystem.isLayerEnabled(CameraLayer.NameLabel)) {
                this.labels.objectNameLabel.element.className = 'selectedSystemLabel';
            }

            if (this.bodySystem.isLayerEnabled(CameraLayer.InfoLabel)) {
                this.labels.objectInfoLabel.element.className = 'selectedSystemLabel';
            }
        } else {
            // ensure the label class style as the non selected style (i.e. just label)
            if (this.bodySystem.isLayerEnabled(CameraLayer.NameLabel)) {
                this.labels.objectNameLabel.element.className = 'label';
            }
            if (this.bodySystem.isLayerEnabled(CameraLayer.InfoLabel)) {
                this.labels.objectInfoLabel.element.className = 'label';
            }
        }

        // update the info label to show the distance from camera for this body
        if (this.bodySystem.isLayerEnabled(CameraLayer.InfoLabel)) {
            this.labels.objectInfoLabel.element.textContent = formatNumber(this.distanceFromCamera()).concat(" km");
        }
    };

    distanceFromCamera(): number {
        return this.bodySystem.camera.position.distanceTo(this.object3D.position);
    }

    formattedDistanceFromCamera(): string {
        return formatNumber(this.distanceFromCamera()).concat(" km");
    }

    planetarySystem(): BodyObject3D {
        return this;
    }
}


function formatNumber(n: number): string {
    return Math.trunc(n).toLocaleString();
}

// function createLabels(bodyObject3D: BodyObject3D): ObjectLabels {
//     const bodyNameDiv = document.createElement('div');
//     bodyNameDiv.className = 'label';
//     bodyNameDiv.textContent = bodyObject3D.getName();
//     bodyNameDiv.style.backgroundColor = 'transparent';

//     const bodyInfoDiv = document.createElement('div');
//     bodyInfoDiv.className = 'label';
//     bodyInfoDiv.textContent = formatNumber(bodyObject3D.distanceFromCamera()).concat(" km");
//     bodyInfoDiv.style.backgroundColor = 'transparent';

//     const objectNameLabel = new CSS2DObject(bodyNameDiv);
//     objectNameLabel.center.set(0, 1);
//     objectNameLabel.layers.set(CameraLayer.NameLabel);

//     const objectInfoLabel = new CSS2DObject(bodyInfoDiv);
//     objectInfoLabel.center.set(0, 0);
//     objectInfoLabel.layers.set(CameraLayer.InfoLabel);

//     listenForClick(bodyNameDiv);

//     return { name: objectNameLabel, info: objectInfoLabel };
// }


// function listenForClick(element: HTMLElement){

//     element.addEventListener("pointerdown", (event) => {
//         console.log("click");
//     });
    
// }
        // stop listening to clock when it gains focus

export { BodyObject3D };