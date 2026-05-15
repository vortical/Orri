import { BufferAttribute, BufferGeometry, Float32BufferAttribute, InterleavedBufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { RenderableBody } from "./RenderableBody";
import { Vector } from "../system/Vector";

const DEFAULT_MAX_VERTICES = 360 * 50 * 4;

/**
 * How far (scene km) the camera target may drift from the buffer origin before the line
 * is rebased. At a magnitude of 1e5 km the Float32 quantization step is ~12 m — well
 * below a pixel — so this keeps near-camera segments jitter-free without rebasing (and
 * re-uploading the buffer) every single frame.
 */
const REBASE_THRESHOLD_KM = 100_000;

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

    /**
     * Scene-km offset the vertex buffer is stored relative to: worldVertex = buffer + origin.
     * The Line's object3D.position mirrors this. Kept near the camera target so near-camera
     * vertices stay small-magnitude and therefore Float32-precise.
     */
    origin: Vector3 = new Vector3();

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

        // Positions are in km in the scene, stored relative to `origin` (see rebase()).
        position = position.clone().multiplyScalar(0.001).sub(this.origin);

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

    /**
     * Record the scene-km origin a freshly built buffer (worker / mission trajectory) was
     * produced relative to, and move the Line's transform to match.
     */
    setOrigin(origin: Vector3) {
        this.origin.copy(origin);
        this.line.position.copy(origin);
    }

    /**
     * Re-express the stored vertices relative to `newOrigin` (scene km) without changing
     * their world position — `worldVertex = buffer + origin` and `line.position = origin`
     * are both updated. Keeping the origin on the camera target keeps near-camera vertices
     * small-magnitude and thus Float32-precise: the fix for orbit segments "skipping" up
     * close. No-op until the target has drifted past REBASE_THRESHOLD_KM.
     */
    rebase(newOrigin: Vector3) {
        if (this.origin.distanceToSquared(newOrigin) < REBASE_THRESHOLD_KM * REBASE_THRESHOLD_KM) return;

        const deltaX = this.origin.x - newOrigin.x;
        const deltaY = this.origin.y - newOrigin.y;
        const deltaZ = this.origin.z - newOrigin.z;
        const positionArray = this.getPositionAttribute().array as Float32Array;
        for (let i = this.startIndex * 3; i < this.endIndex * 3; i += 3) {
            positionArray[i] += deltaX;
            positionArray[i + 1] += deltaY;
            positionArray[i + 2] += deltaZ;
        }

        this.origin.copy(newOrigin);
        this.line.position.copy(newOrigin);

        if (this.endIndex > this.startIndex) {
            if (this.endIndex - this.startIndex >= 2) {
                this.p0 = this.positionAtIndex(this.endIndex - 2);
                this.p1 = this.positionAtIndex(this.endIndex - 1);
            }
            this.needsUpdate();
        }
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
