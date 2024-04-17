import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BodyObject3D } from './BodyObject3D';
import { BodySystem } from '../scene/BodySystem';
import { CameraLayer } from '../scene/CameraLayer';
import { AltitudeAzimuth } from "../system/AltitudeAzimuth";
import { CameraModes } from '../scene/CameraTargetingState';

class ObjectLabels {
    nameLabel: NameLabel;
    distanceLabel: DistanceLabel;
    altitudeAzimuthLabel: AltitudeAzimuthLabel;
    bodyObject3D: BodyObject3D;
    isHighlighted?: boolean;

    constructor(bodyObject3D: BodyObject3D) {
        this.nameLabel = new NameLabel(createCSS2DObject(1, bodyObject3D.getName(), CameraLayer.NameLabel), CameraLayer.NameLabel, bodyObject3D);
        this.distanceLabel = new DistanceLabel(createCSS2DObject(0, "0", CameraLayer.DistanceLabel), CameraLayer.DistanceLabel, bodyObject3D);
        this.altitudeAzimuthLabel = new AltitudeAzimuthLabel(createCSS2DObject(-1, "23,23", CameraLayer.ElevationAzimuthLabel), CameraLayer.ElevationAzimuthLabel, bodyObject3D);
        this.bodyObject3D = bodyObject3D;
        this.setupLabelClickHandler();
    }

    getCSS2DObjects(): CSS2DObject[] {
        return this.getLabels().map((l: Label) => l.cssObject);
    }

    getLabels(): Label[] {
        return [this.nameLabel, this.distanceLabel, this.altitudeAzimuthLabel];
    }

    setHighlighted(value: boolean) {
        if (this.isHighlighted !== value) {
            this.isHighlighted = value;
            this.getLabels().forEach((label: Label) => label.setHighlighted(value));
        }
    }

    setupLabelClickHandler() {

        const downclickhandler = () => {
            this.bodyObject3D.moveToTarget();
        };

        // This is a poor mans's implementation of handling pointer.
        this.nameLabel.cssObject.element.addEventListener("pointerdown", downclickhandler);
        this.distanceLabel.cssObject.element.addEventListener("pointerdown", downclickhandler);
        this.altitudeAzimuthLabel.cssObject.element.addEventListener("pointerdown", downclickhandler);
    }

    isPlanetarySystemSelected() {
        const currentTarget = this.bodyObject3D.bodySystem.getBodyObject3DTarget();
        return this.bodyObject3D.body.planetarySystem() == currentTarget.body.planetarySystem()
    }

    clearBodyLabels() {
        this.getLabels().forEach((l: Label) => l.setValue(""));
    }

    updateBodyLabels() {

        if (this.bodyObject3D.bodySystem.isLayerEnabled(CameraLayer.DistanceLabel)) {
            this.distanceLabel.cssObject.center.set(0, 0);
            this.altitudeAzimuthLabel.cssObject.center.set(0, -1);
        } else {
            this.altitudeAzimuthLabel.cssObject.center.set(0, 0);
        }


        this.setHighlighted(this.isPlanetarySystemSelected());
        this.getLabels().forEach((l: Label) => l.update());
    };

    updateMoonLabels() {
        // We show moon labels if this moon's planetarySystem is selected and we are with tolerance distance 
        // -or-
        // We are simply really close to it

        const isSystemSelected = this.isPlanetarySystemSelected();
        const cameraDistance = this.bodyObject3D.cameraDistance();

        if ((isSystemSelected && cameraDistance < 35e6) || cameraDistance < 1e6 || this.bodyObject3D.bodySystem.getBodyObject3DTarget() == this.bodyObject3D) {
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
    cameraLayer: CameraLayer;
    bodySystem: BodySystem;
    bodyObject3D: BodyObject3D;
    abstract isHeader: boolean;

    constructor(cssObject: CSS2DObject, cameraLayer: CameraLayer, bodyObject3D: BodyObject3D) {
        this.cssObject = cssObject;
        this.cameraLayer = cameraLayer;
        this.bodySystem = bodyObject3D.bodySystem;
        this.bodyObject3D = bodyObject3D;
    }

    setHighlighted(value: boolean) {
        const infoClass = this.isHeader ? "" : " info"
        const cssClassName = value ? 'selectedSystemLabel'.concat(infoClass) : 'label'.concat(infoClass);

        if (this.cssObject.element.className !== cssClassName) {
            this.cssObject.element.className = cssClassName;
        }
    }

    setValue(value: string) {
        if (this.bodySystem.isLayerEnabled(this.cameraLayer) && this.cssObject.element.textContent !== value) {
            this.cssObject.element.textContent = value;
        }
    }

    isEnabled(): boolean {
        return this.bodySystem.isLayerEnabled(this.cameraLayer);
    }

    abstract update(): void;
}

class NameLabel extends Label {
    isHeader: boolean = true;

    update(): void {
        if (this.isEnabled()) {
            this.setValue(this.bodyObject3D.getName());
        }
    }
}

class DistanceLabel extends Label {
    isHeader: boolean = false;
    update(): void {
        if (this.isEnabled()) {
            this.setValue(this.bodyObject3D.cameraDistanceAsString());
        }
    }
}

class AltitudeAzimuthLabel extends Label {
    isHeader: boolean = false;
    previousAltaz?: AltitudeAzimuth;

    update(): void {

        if (this.isEnabled()) {
            if (this.bodySystem.getCameraTargetingMode() == CameraModes.ViewTargetFromSurface) {
                const altaz = this.bodyObject3D.altitudeAzimuthFromLocationPin();
                altaz?.calcTrend(this.previousAltaz);
                this.previousAltaz = altaz;
                this.setValue(altaz?.toString() || "");
            } else {
                this.setValue("");
            }
        }
    }

    trend(previous: AltitudeAzimuthLabel) {

    }
}

export { ObjectLabels };