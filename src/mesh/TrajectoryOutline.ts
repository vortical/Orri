import { BufferAttribute, BufferGeometry, Float32BufferAttribute, InterleavedBufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { RenderableBody } from "./RenderableBody";
import { Vector } from "../system/Vector";

const DEFAULT_MAX_VERTICES = 360 * 50 * 4;

/**
 * Base class for any visual path tied to a RenderableBody — orbital paths,
 * spacecraft trajectories, etc. Owns the Three.js Line, the position buffer,
 * and the visibility/opacity/color surface. Subclasses implement
 * `createTrajectory` to produce the path data appropriate to their kind.
 */
export abstract class TrajectoryOutline {
    line: Line;
    material: LineBasicMaterial;
    _colorHue!: number;
    startIndex: number = 0;
    endIndex: number = 0;
    maxVertices: number;
    nbVertices: number = 355 * 4;
    totalAngle = 0;
    p0!: Vector3;
    p1!: Vector3;
    bodyObject?: RenderableBody;

    constructor(bodyObject?: RenderableBody, maxVertices = DEFAULT_MAX_VERTICES, enabled = false, _colorHue = 0.5, opacity = 0.7) {
        this.bodyObject = bodyObject;

        const geometry = new BufferGeometry();
        const positionAttribute = new Float32BufferAttribute(new Float32Array(maxVertices * 3), 3);
        geometry.setAttribute('position', positionAttribute);

        this.material = new LineBasicMaterial({ color: 0xffffff, opacity: opacity, transparent: true });
        this.line = new Line(geometry, this.material);
        this.maxVertices = maxVertices;

        this.enabled = enabled;
        this.opacity = opacity;
        // TODO: colorHue is NOT set here — the material stays white ... we should use the colorHue...
    }

    abstract createTrajectory(): void;

    getObject3D(): Object3D {
        return this.line;
    }

    reset() {
        this.startIndex = 0;
        this.endIndex = 0;
        this.nbVertices = 0;
    }

    addPosition(position: Vector3, _maintainLength: boolean = false) {
        const positionAttributeBuffer: BufferAttribute = this.line.geometry.getAttribute('position') as BufferAttribute;

        // Positions are in km in the scene...
        position = position.clone().multiplyScalar(0.001);

        if (this.endIndex == 0) {
            this.p0 = position;
            positionAttributeBuffer.setXYZ(this.endIndex++, position.x, position.y, position.z);
        } else if (this.endIndex == 1) {
            if (position.equals(this.p0)) {
                return;
            }
            this.p1 = position;
            positionAttributeBuffer.setXYZ(this.endIndex++, position.x, position.y, position.z);
        } else {
            if (position.equals(this.p1)) {
                return;
            }
            const v1 = Vector.substract(this.p0, this.p1);
            const v2 = Vector.substract(this.p1, position);
            const angle = Math.abs(v1.angleTo(v2));

            if (angle > Math.PI / 1440) {
                this.totalAngle += angle;
                this.p0 = this.p1.clone();
                this.p1 = position;
                positionAttributeBuffer.setXYZ(this.endIndex++, position.x, position.y, position.z);
                if (this.endIndex - this.startIndex > this.nbVertices) {
                    this.startIndex++;
                    if (this.endIndex >= this.maxVertices) {
                        this.shiftPositionBufferAttribute();
                    }
                }
            } else {
                this.p1 = position;
                positionAttributeBuffer.setXYZ(this.endIndex - 1, position.x, position.y, position.z);
            }
        }
    }

    positionAtIndex(i: number): Vector {
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        const arrayIndex = i * 3;
        return new Vector(sourcePositionArray[arrayIndex], sourcePositionArray[arrayIndex + 1], sourcePositionArray[arrayIndex + 2]);
    }

    shiftPositionBufferAttribute() {
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        sourcePositionArray.copyWithin(0, this.startIndex * 3, this.endIndex * 3);
        this.endIndex = this.endIndex - this.startIndex;
        this.startIndex = 0;
    }

    flipPositionBufferAttribute() {
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        const targetPositionArray = new Float32Array(this.maxVertices * 3);

        for (let sourceIndex = 3 * (this.endIndex - 1), targetIndex = 0; sourceIndex >= 0; sourceIndex -= 3, targetIndex += 3) {
            for (let c = 0; c < 3; c++) {
                targetPositionArray[targetIndex + c] = sourcePositionArray[sourceIndex + c];
            }
        }
        this.setPositionAttributeBuffer(targetPositionArray, this.endIndex);
    }

    getPositionAttribute(): BufferAttribute | InterleavedBufferAttribute {
        return this.line.geometry.attributes['position'];
    }

    setPositionAttributeBuffer(positionAttribute: Float32Array, index: number) {
        this.line.geometry.attributes['position'].array.set(positionAttribute);
        this.endIndex = index;
        this.p0 = this.positionAtIndex(index - 2);
        this.p1 = this.positionAtIndex(index - 1);
        this.startIndex = 0;
    }

    needsUpdate() {
        const positionAttributeBuffer = this.line.geometry.getAttribute('position') as BufferAttribute;
        this.line.geometry.setDrawRange(this.startIndex, this.endIndex - this.startIndex);
        positionAttributeBuffer.needsUpdate = true;
        this.line.geometry.computeBoundingSphere();
    }

    set opacity(value: number) {
        this.material.opacity = value;
    }

    get opacity(): number {
        return this.material.opacity;
    }

    set colorHue(value: number) {
        this._colorHue = value;
        this.material.color.setHSL(value, 0.8, 0.5, SRGBColorSpace);
    }

    get colorHue(): number {
        return this._colorHue;
    }

    set enabled(value: boolean) {
        if (this.line.visible != value) {
            if (value) {
                this.createTrajectory();
            }
            this.line.visible = value;
        }
    }

    get enabled(): boolean {
        return this.line.visible;
    }
}
