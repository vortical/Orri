import { Object3D } from "three";


/**
 * Composite 3D object with an update
 * method.
 * 
 * The fundemental role of this class is to enable drilling down
 * an object hierachy and update the individual parts.
 * 
 * E.g.: A planet has parts: surface, atmosphere, rings
 * 
 * It is up to the concrete classes to implement the update mechanism.
 */
export abstract class CelestialBodyPart {
    readonly childParts: CelestialBodyPart[] = []

    abstract getObject3D(): Object3D;
    abstract updatePart(): void;

    addPart(part: CelestialBodyPart | undefined): CelestialBodyPart {
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
