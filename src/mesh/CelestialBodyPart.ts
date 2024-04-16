import { Object3D } from "three";


/**
 * 3D object with an update
 * method.
 */
export abstract class CelestialBodyPart {
    readonly childParts: CelestialBodyPart[] = []

    abstract getObject3D(): Object3D;
    abstract updatePart(): void;

    addPart(part: CelestialBodyPart|undefined): CelestialBodyPart {
        if (part != undefined) {
            this.getObject3D().add(part.getObject3D());
            this.childParts.push(part);
        }
        return this;
    }

    update(): void {
        this.updatePart();
        this.childParts.forEach(p => p.update())
    }
}
