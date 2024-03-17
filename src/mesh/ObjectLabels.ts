import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BodyObject3D } from './BodyObject3D';
import { BodySystem, CameraLayer } from '../scene/BodySystem';

class ObjectLabels{
    nameLabel: NameLabel; //CSS2DObject;
    distanceLabel: DistanceLabel;// CSS2DObject;
    altitudeAzimuthLabel: AltitudeAzimuthLabel;//CSS2DObject;
    bodyObject3D: BodyObject3D;
    isHighlighted?: boolean;

    constructor(bodyObject3D: BodyObject3D){
        this.nameLabel = new NameLabel(createCSS2DObject(1, bodyObject3D.getName(), CameraLayer.NameLabel), CameraLayer.NameLabel,bodyObject3D);
        this.distanceLabel = new DistanceLabel(createCSS2DObject(0, "0", CameraLayer.DistanceLabel), CameraLayer.DistanceLabel,bodyObject3D);
        this.altitudeAzimuthLabel = new AltitudeAzimuthLabel(createCSS2DObject(-1, "23,23", CameraLayer.ElevationAzimuthLabel),CameraLayer.ElevationAzimuthLabel,bodyObject3D);
        this.bodyObject3D = bodyObject3D;
        this.setupLabelClickHandler();
    }

    getCSS2DObjects(): CSS2DObject[] {
        return this.getLabels().map( (l: Label) => l.cssObject);
    }

    getLabels(): Label[]{
        return [this.nameLabel, this.distanceLabel, this.altitudeAzimuthLabel];
    }

    setHighlighted(value: boolean) {
        if (this.isHighlighted !== value){
            this.isHighlighted = value;
            this.getLabels().forEach( (label: Label) => label.setHighlighted(value));
        }
    }

    setupLabelClickHandler(){

        const downclickhandler = () => {
            this.bodyObject3D.moveToTarget();
        };

        // This is a poor mans's implementation.
        // todo: handle this by triggering on the click on the 'pointerup' event, if
        // it was not moved between the pointerdown and pointer up            
        this.nameLabel.cssObject.element.addEventListener("pointerdown", downclickhandler);
        this.distanceLabel.cssObject.element.addEventListener("pointerdown", downclickhandler);
        this.altitudeAzimuthLabel.cssObject.element.addEventListener("pointerdown", downclickhandler);
    }

    isPlanetarySystemSelected(){
        const currentTarget = this.bodyObject3D.bodySystem.getBodyObject3DTarget();
        return this.bodyObject3D.body.planetarySystem() == currentTarget.body.planetarySystem()
    }

    clearBodyLabels() {
        this.getLabels().forEach((l: Label) => l.setValue(""));
    }

    updateBodyLabels() {
        this.setHighlighted(this.isPlanetarySystemSelected());
        this.getLabels().forEach((l: Label) => l.update());
    };
 
    updateMoonLabels(){
        // todo: we don't need this method. We should just extend the label classes to have this logic.

        // We show moon labels if this moon's planetarySystem is selected and we are with tolerance distance 
        // -or-
        // We are simply really close to it

        const isSystemSelected = this.isPlanetarySystemSelected();
        const cameraDistance = this.bodyObject3D.cameraDistance();

        if((isSystemSelected && cameraDistance < 35e6 ) || cameraDistance < 1e6)  {
            this.updateBodyLabels();
        } else {
            this.clearBodyLabels();
        }
    };
}

function createCSS2DObject(center: number, textContent: string, layer: CameraLayer): CSS2DObject {
    const elementDiv = document.createElement('div');
    elementDiv.className = 'label';
    elementDiv.textContent = textContent;
    elementDiv.style.backgroundColor = 'transparent';
    const label = new CSS2DObject(elementDiv);
    label.center.set(0, center);
    label.layers.set(layer);
    return label;
}

abstract class Label {
    cssObject: CSS2DObject;
    cameraLayer:  CameraLayer;
    bodySystem: BodySystem;
    bodyObject3D: BodyObject3D;

    constructor(cssObject: CSS2DObject, cameraLayer: CameraLayer,  bodyObject3D: BodyObject3D) {
        this.cssObject = cssObject;
        this.cameraLayer = cameraLayer;
        this.bodySystem = bodyObject3D.bodySystem;
        this.bodyObject3D = bodyObject3D;
    }

    setHighlighted(value: boolean){
        const cssClassName = value ? 'selectedSystemLabel': 'label';
        if ( this.cssObject.element.className !== cssClassName){
            this.cssObject.element.className = cssClassName;
        }
    }

    setValue(value: string) {
        if( this.bodySystem.isLayerEnabled(this.cameraLayer) && this.cssObject.element.textContent !== value){        
            this.cssObject.element.textContent = value;
        }        
    }

    isEnabled(): boolean {
        return this.bodySystem.isLayerEnabled(this.cameraLayer);
    }

    abstract update(): void;
}

class NameLabel extends Label {
    update(): void{
        if (this.isEnabled()){
            this.setValue(this.bodyObject3D.getName());
        }
    }
}

class DistanceLabel extends Label {
    update(): void{
        if (this.isEnabled()){
            this.setValue(this.bodyObject3D.cameraDistanceAsString());
        }
    }
}

class AltitudeAzimuthLabel extends Label {
    update(): void{
        if (this.isEnabled()){
            const altaz = this.bodyObject3D.altitudeAzimuthFromLocationPin();
            this.setValue(altaz?.toString() || "");
        }        
    }
}

export { ObjectLabels };