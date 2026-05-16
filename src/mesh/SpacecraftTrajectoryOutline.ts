import { RenderableBody } from "./RenderableBody";
import { Vector } from "../system/Vector";
import { Body } from '../body/Body.ts';
import { BodySystem } from "../scene/BodySystem.ts";
import { BodyProperties, MissionWindow } from "../domain/models.ts";
import { ExecutorPool } from "../system/ExecutorPool.ts";
import { TrajectoryOutline } from "./TrajectoryOutline";
import { RenderableSpacecraft } from "./RenderableSpacecraft.ts";
import { Color, SRGBColorSpace, Vector3 } from "three";

const MAX_VERTICES = 360 * 50 * 4;

/** Shared base colour for every spacecraft trajectory — a blue, so spacecraft read as a class. */
const BASE_COLOR = new Color().setHSL(0.6, 0.7, 0.55, SRGBColorSpace);

// Burn segments use a red→yellow heat ramp; hue (and lightness) scale with intensity.
const THRUST_HUE_MIN = 0.0;   // red — weakest burn
const THRUST_HUE_MAX = 0.15;  // yellow — strongest burn
const THRUST_SATURATION = 1.0;
const THRUST_LIGHTNESS_MIN = 0.5;
const THRUST_LIGHTNESS_MAX = 0.62;
// Acceleration magnitude range (m/s²) mapped onto the brightness ramp — observed for artemis2.
const THRUST_MAGNITUDE_MIN = 0.005;
const THRUST_MAGNITUDE_MAX = 2.25;
// Burn intensity is quantised into this many discrete brightness levels, so a burn shows a
// few intensity bands rather than a vertex at every continuously-varying point.
const THRUST_INTENSITY_LEVELS = 10;

/** Pre-built red→yellow heat-ramp palette, indexed by quantised intensity level. */
const THRUST_COLORS: Color[] = Array.from({ length: THRUST_INTENSITY_LEVELS }, (_, level) => {
    const fraction = level / (THRUST_INTENSITY_LEVELS - 1);
    const hue = THRUST_HUE_MIN + fraction * (THRUST_HUE_MAX - THRUST_HUE_MIN);
    const lightness = THRUST_LIGHTNESS_MIN + fraction * (THRUST_LIGHTNESS_MAX - THRUST_LIGHTNESS_MIN);
    return new Color().setHSL(hue, THRUST_SATURATION, lightness, SRGBColorSpace);
});


export class SpacecraftTrajectoryOutline extends TrajectoryOutline {
   missionWindow: MissionWindow;

    constructor(spacecraft: RenderableSpacecraft, maxVertices = MAX_VERTICES, enabled = false, colorHue = 0.5, opacity = 0.7) {
        super(spacecraft, maxVertices, enabled, colorHue, opacity);
        this.missionWindow = spacecraft.body.missionWindow!;
        this.enableVertexColors();
        // A vertex added with no explicit colour falls back to the shared base colour.
        this.defaultColor = BASE_COLOR;
    }

    /** Blue while coasting; an orange whose brightness band reflects the burn magnitude at `timeMs`. */
    private colorForTime(timeMs: number): Color {
        const acceleration = this.bodyObject!.body.getActiveBurnAcceleration(timeMs);
        if (acceleration === undefined) {
            return BASE_COLOR;
        }
        const magnitude = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
        const span = Math.log(THRUST_MAGNITUDE_MAX / THRUST_MAGNITUDE_MIN);
        const t = Math.min(1, Math.max(0, Math.log(magnitude / THRUST_MAGNITUDE_MIN) / span));
        const level = Math.round(t * (THRUST_INTENSITY_LEVELS - 1));
        return THRUST_COLORS[level];
    }

    /** Live tail appends — coloured by whether the craft is thrusting at the current clock time. */
    addPosition(position: Vector3, maintainLength: boolean = false, color?: Color) {
        const liveColor = color ?? this.colorForTime(this.bodyObject!.bodySystem.clock.getTime());
        super.addPosition(position, maintainLength, liveColor);
    }

    
    createTrajectory() {
        if (this.bodyObject == undefined) {
            return;
        }
        this.reset();


        console.log("Create Spacecraft Trajectory:" + this.bodyObject.getName());

        const bodySystem = this.bodyObject.bodySystem;

        // Store vertices relative to the camera target so near-camera segments stay
        // Float32-precise; subsequent drift is handled per-frame by rebase().
        this.setOrigin(bodySystem.getTargetSceneOrigin());

        // get the start and end date of the mission


        // get positions up to the the timeMs

        const timeMs = this.bodyObject.bodySystem.clock.getTime();

        
        const trajectory = this.missionWindow.trajectory;
        if(trajectory !== undefined){
          // once this is reached (it won't be reached), the lines stops growing.
          this.nbVertices = trajectory?.length;
          let index = 0;
          while(index < trajectory.length && trajectory[index].timeMs <= timeMs) {
            // positions are in metres (TrajectoryPoint — see models.ts); addPosition converts
            const trajectoryPoint = trajectory[index];
            const point = trajectoryPoint.position;
            // Colour each point by its own time; super.addPosition bypasses the live-tail
            // override so the per-point burn colour is kept.
            super.addPosition(new Vector(point[0], point[1], point[2]), false, this.colorForTime(trajectoryPoint.timeMs));
            index++;

          }

          this.needsUpdate();
        }
    }



  
}


