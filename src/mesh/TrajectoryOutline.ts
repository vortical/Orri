import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, InterleavedBufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
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

    /**
     * Scene-km offset the vertex buffer is stored relative to: worldVertex = buffer + origin.
     * The Line's object3D.position mirrors this. `recenter()` keeps it on the camera target
     * every frame so near-camera vertices — and the float32 modelView matrix — stay
     * small-magnitude and therefore precise.
     */
    origin: Vector3 = new Vector3();

    /**
     * Float64 source of truth: the same vertices as the GPU buffer but in true scene-km
     * world coords. `recenter()` derives the float32 buffer from this fresh each frame, so
     * re-expressing the line against a moving origin never accumulates rounding error.
     */
    master: Float64Array;

    /**
     * Optional per-vertex RGB attribute, enabled via `enableVertexColors()`. Subclasses that
     * need varying colour along the line (spacecraft trajectories — thrust segments) opt in;
     * orbits leave it undefined and render with the single uniform material colour.
     */
    colorAttribute?: BufferAttribute;
    /** Fallback colour for vertices added via `addPosition` without an explicit colour. */
    protected defaultColor: Color = new Color(1, 1, 1);
    /** Colours of the decimation anchors p0 / p1 — used to keep colour runs as solid segments. */
    private anchorColor: Color = new Color();
    private tailColor: Color = new Color();
    private colorsDirty = false;

    constructor(bodyObject?: RenderableBody, maxVertices = DEFAULT_MAX_VERTICES, enabled = false, _colorHue = 0.5, opacity = 0.7) {
        this.bodyObject = bodyObject;

        const geometry = new BufferGeometry();
        const positionAttribute = new Float32BufferAttribute(new Float32Array(maxVertices * 3), 3);
        positionAttribute.setUsage(DynamicDrawUsage);
        geometry.setAttribute('position', positionAttribute);
        this.master = new Float64Array(maxVertices * 3);

        this.material = new LineBasicMaterial({ color: 0xffffff, opacity: opacity, transparent: true });
        this.line = new Line(geometry, this.material);
        // The line is recentred to the camera every frame, so its bounding sphere is never
        // computed; skip frustum culling rather than maintain a stale sphere.
        this.line.frustumCulled = false;
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

    /** Opt in to per-vertex colours: allocate the RGB attribute and switch the material to it. */
    protected enableVertexColors() {
        const colorAttribute = new Float32BufferAttribute(new Float32Array(this.maxVertices * 3), 3);
        this.line.geometry.setAttribute('color', colorAttribute);
        this.colorAttribute = colorAttribute;
        this.material.vertexColors = true;
        this.material.needsUpdate = true;
    }

    addPosition(position: Vector3, _maintainLength: boolean = false, color?: Color) {
        // Incoming position is in metres. The master holds true scene-km world coords; the
        // GPU buffer holds them relative to `origin` (see recenter()).
        // The decimation anchors p0/p1 and the angle test are kept in WORLD km — origin-
        // independent, so they stay precise and are never invalidated when recenter()
        // moves the origin each frame.
        const worldKm = position.clone().multiplyScalar(0.001);
        const relative = worldKm.clone().sub(this.origin);
        const vertexColor = color ?? this.defaultColor;

        if (this.endIndex == 0) {
            this.p0 = worldKm;
            this.anchorColor = vertexColor;
            this.writeVertex(this.endIndex++, relative, worldKm, vertexColor);
        } else if (this.endIndex == 1) {
            if (worldKm.equals(this.p0)) {
                return;
            }
            this.p1 = worldKm;
            this.tailColor = vertexColor;
            this.writeVertex(this.endIndex++, relative, worldKm, vertexColor);
        } else {
            if (worldKm.equals(this.p1)) {
                return;
            }
            const v1 = Vector.substract(this.p0, this.p1);
            const v2 = Vector.substract(this.p1, worldKm);
            const angle = Math.abs(v1.angleTo(v2));

            // Commit on a colour change, AND while the live segment p0→p1 still straddles a
            // colour boundary — that forces a second commit right after a change, so each
            // colour run becomes its own solid segment instead of one creeping gradient.
            const colorBoundary = this.colorAttribute !== undefined
                && (!vertexColor.equals(this.tailColor) || !this.tailColor.equals(this.anchorColor));

            if (angle > Math.PI / 1440 || colorBoundary) {
                this.totalAngle += angle;
                this.p0 = this.p1.clone();
                this.p1 = worldKm;
                this.anchorColor = this.tailColor;
                this.tailColor = vertexColor;
                this.writeVertex(this.endIndex++, relative, worldKm, vertexColor);
                if (this.endIndex - this.startIndex > this.nbVertices) {
                    this.startIndex++;
                    if (this.endIndex >= this.maxVertices) {
                        this.shiftPositionBufferAttribute();
                    }
                }
            } else {
                this.p1 = worldKm;
                this.tailColor = vertexColor;
                this.writeVertex(this.endIndex - 1, relative, worldKm, vertexColor);
            }
        }
    }

    /** Write one vertex to the float32 GPU buffer (origin-relative), the master (world km), and the colour attribute. */
    private writeVertex(index: number, relative: Vector3, worldKm: Vector3, color: Color) {
        const buffer = this.getPositionAttribute() as BufferAttribute;
        buffer.setXYZ(index, relative.x, relative.y, relative.z);
        const offset = index * 3;
        this.master[offset] = worldKm.x;
        this.master[offset + 1] = worldKm.y;
        this.master[offset + 2] = worldKm.z;
        if (this.colorAttribute) {
            this.colorAttribute.setXYZ(index, color.r, color.g, color.b);
            this.colorsDirty = true;
        }
    }

    /** The world scene-km position of vertex `i`, read from the float64 master. */
    worldVertexAt(i: number): Vector3 {
        const offset = i * 3;
        return new Vector3(this.master[offset], this.master[offset + 1], this.master[offset + 2]);
    }

    shiftPositionBufferAttribute() {
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        sourcePositionArray.copyWithin(0, this.startIndex * 3, this.endIndex * 3);
        this.master.copyWithin(0, this.startIndex * 3, this.endIndex * 3);
        if (this.colorAttribute) {
            (this.colorAttribute.array as Float32Array).copyWithin(0, this.startIndex * 3, this.endIndex * 3);
            this.colorsDirty = true;
        }
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

    /**
     * Install a freshly built (worker / mission) float32 buffer. The buffer is expressed
     * relative to the current `origin`, so call `setOrigin` first; the float64 master is
     * rebuilt here as `buffer + origin`.
     */
    setPositionAttributeBuffer(positionAttribute: Float32Array, index: number) {
        this.line.geometry.attributes['position'].array.set(positionAttribute);
        for (let i = 0; i < index * 3; i += 3) {
            this.master[i] = positionAttribute[i] + this.origin.x;
            this.master[i + 1] = positionAttribute[i + 1] + this.origin.y;
            this.master[i + 2] = positionAttribute[i + 2] + this.origin.z;
        }
        this.endIndex = index;
        this.p0 = this.worldVertexAt(index - 2);
        this.p1 = this.worldVertexAt(index - 1);
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
     * Re-express the stored vertices relative to `newOrigin` (scene km), derived fresh from
     * the float64 `master` (so no incremental re-quantization), without changing their world
     * position. `line.position` mirrors the origin. Called every frame with the camera
     * target: keeps the origin — and thus the float32 modelView matrix — small-magnitude,
     * which is what stops the line shaking when viewed up close.
     */
    recenter(newOrigin: Vector3) {
        this.origin.copy(newOrigin);
        this.line.position.copy(newOrigin);

        if (this.endIndex <= this.startIndex) {
            return;
        }

        const positionArray = this.getPositionAttribute().array as Float32Array;
        for (let i = this.startIndex * 3; i < this.endIndex * 3; i += 3) {
            positionArray[i] = this.master[i] - newOrigin.x;
            positionArray[i + 1] = this.master[i + 1] - newOrigin.y;
            positionArray[i + 2] = this.master[i + 2] - newOrigin.z;
        }

        // p0/p1 are world-km (origin-independent) — the moving origin does not affect them.

        this.needsUpdate();
    }

    needsUpdate() {
        const positionAttributeBuffer = this.getPositionAttribute() as BufferAttribute;
        const count = this.endIndex - this.startIndex;
        this.line.geometry.setDrawRange(this.startIndex, count);
        // Upload only the used range, not the (over-allocated) whole buffer.
        positionAttributeBuffer.clearUpdateRanges();
        positionAttributeBuffer.addUpdateRange(this.startIndex * 3, count * 3);
        positionAttributeBuffer.needsUpdate = true;

        // Colours change only when vertices are added/shifted, not every frame — upload
        // them only when actually dirty (recenter() calls needsUpdate every frame).
        if (this.colorAttribute && this.colorsDirty) {
            this.colorAttribute.clearUpdateRanges();
            this.colorAttribute.addUpdateRange(this.startIndex * 3, count * 3);
            this.colorAttribute.needsUpdate = true;
            this.colorsDirty = false;
        }
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
