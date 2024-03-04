import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BodyObject3D } from './BodyObject3D';
import { CameraLayer } from '../scene/BodySystem';


class ObjectLabels{
    objectNameLabel: CSS2DObject;
    objectInfoLabel: CSS2DObject;
    bodyObject3D: BodyObject3D;

    constructor(bodyObject3D: BodyObject3D){

        this.objectNameLabel = ObjectLabels.#createLabel(1, bodyObject3D.getName(),CameraLayer.NameLabel);
        this.objectInfoLabel = ObjectLabels.#createLabel(0, bodyObject3D.cameraDistanceAsString(), CameraLayer.InfoLabel);

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
            // this.bodyObject3D.setAsTarget()
            this.bodyObject3D.moveToTarget();
        };
    
        this.objectNameLabel.element.addEventListener("pointerdown", handler);
        this.objectInfoLabel.element.addEventListener("pointerdown", handler);
    
    }

    getLabels(): CSS2DObject[]{
        return [this.objectNameLabel, this.objectInfoLabel];
    }


    updateBodyLabels() {
        // we only show moon/satellite labels if the that system is selected else from a distance they are all in the same 
        // area and unreadable
        const bodySystem = this.bodyObject3D.bodySystem;
        const currentTarget = bodySystem.getBodyObject3DTarget();
        const that = this;

        /**
         * Labels have either a selected css style  or just the regular label style
         * depending if this body is part of the selected system.
         * 
         * @param thisPlaneteraySystem 
         * @param selectedPlanetarySystem 
         */
        function setObjectLabelClass(thisPlaneteraySystem: any, selectedPlanetarySystem: any){

            if (thisPlaneteraySystem == selectedPlanetarySystem) {
                // set the label class style as selected
                if (bodySystem.isLayerEnabled(CameraLayer.NameLabel)) {
                    that.objectNameLabel.element.className = 'selectedSystemLabel';
                }

                if (bodySystem.isLayerEnabled(CameraLayer.InfoLabel)) {
                    that.objectInfoLabel.element.className = 'selectedSystemLabel';
                }
            } else {
                // ensure the label class style as the non selected style (i.e. just label)
                if (bodySystem.isLayerEnabled(CameraLayer.NameLabel)) {
                    that.objectNameLabel.element.className = 'label';
                }
                if (bodySystem.isLayerEnabled(CameraLayer.InfoLabel)) {
                    that.objectInfoLabel.element.className = 'label';
                }
            }
        }

        setObjectLabelClass(this.bodyObject3D.body.planetarySystem(), currentTarget.body.planetarySystem() );

        // update the info label to show the distance from camera for this body
        if (bodySystem.isLayerEnabled(CameraLayer.InfoLabel)) {
            this.objectInfoLabel.element.textContent = this.bodyObject3D.cameraDistanceAsString();
        }
    };
 
    updateMoonLabels(){

        // we only show moon/satellite labels if this moon's planetarySystem is selected else from a distance they are all in the same 
        // area and unreadable

        const bodySystem = this.bodyObject3D.bodySystem;
                
        if(bodySystem.isLayerEnabled(CameraLayer.InfoLabel) || bodySystem.isLayerEnabled(CameraLayer.NameLabel)){
            const currentTarget = bodySystem.getBodyObject3DTarget();

            const isMoonPlanetarySystem = this.bodyObject3D.body.planetarySystem() == currentTarget.body.planetarySystem();
            const isDistanceWithinTolerance = this.bodyObject3D.cameraDistance() < 35000000;

            // business as usual, ensure the name is set
            if(isMoonPlanetarySystem && isDistanceWithinTolerance){
                this.objectNameLabel.element.textContent = this.bodyObject3D.getName();
                this.updateBodyLabels();
            } else {
                if(bodySystem.isLayerEnabled(CameraLayer.NameLabel)){
                    if(this.objectNameLabel.element.textContent !== ""){
                        this.objectNameLabel.element.textContent = "";
                    }
                }
                if(bodySystem.isLayerEnabled(CameraLayer.InfoLabel)){
                    if(this.objectInfoLabel.element.textContent !== ""){
                        this.objectInfoLabel.element.textContent = "";
                    }
                } 
            }
        }

    };
  
}


export { ObjectLabels };