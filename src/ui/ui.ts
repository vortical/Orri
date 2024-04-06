import { BodySystem, CameraLayer } from '../scene/BodySystem.ts'
import GUI, { Controller } from 'lil-gui';
import PubSub from 'pubsub-js';
import { SYSTEM_TIME_TOPIC, MOUSE_HOVER_OVER_BODY_TOPIC, MOUSE_CLICK_ON_BODY_TOPIC, BODY_SELECT_TOPIC, TIME_SCALE_TOPIC } from '../system/event-types.ts';
import LocationBar from './LocationBar.ts';
import { PickerEvent } from '../scene/Picker.ts';
import { TimeUnit, formatPeriod, throttle, timeEquals, timePeriodToUnits, unitsToTimePeriod } from "../system/timing.ts";
import { ClockTimeUpdateHandler } from './ClockTimeUpdateHandler.ts';
import { BodiesAtTimeUpdater } from '../body/BodiesAtTimeUpdater.ts';
import { DataService } from '../services/dataservice.ts';
import { ShadowType } from '../domain/models.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { DistanceUnit, DistanceUnits, LatLon } from '../system/geometry.ts';
import { CameraMode, CameraModes } from '../scene/CameraTargetingState.ts';
import { INotifyService, NotifyService } from './notify.ts';
import flatpickr from "flatpickr";
import { Instance } from 'flatpickr/dist/types/instance';
import { TimeScaleProvider } from './TimeScaleProvider.ts';
import { ClockDateTimeInput } from './ClockDateTimeInput.ts';

// import { ShadowType} from '../mesh/Umbra.ts';


const userNotify: INotifyService = new NotifyService();


// for targets and modes: 
// https://codepen.io/sean_codes/pen/WdzgdY


export class TimeControls {
    rewindButton: HTMLInputElement;
    playPauseButton: HTMLInputElement;
    forwardButton: HTMLInputElement;
    nowButton: HTMLInputElement;
    resetTimeScaleButton: HTMLInputElement;
    timeScaleLabel: HTMLDivElement;
    timeScalePeriodLabel: HTMLDivElement;

    bodySystem: BodySystem;
    dataService: DataService;
    scaleProvider: TimeScaleProvider;
    clockDateTimeInput: ClockDateTimeInput;

    timescaleSubscribtion: any;

    constructor(bodySystem: BodySystem, dataService: DataService){
        this.timeScalePeriodLabel = document.querySelector<HTMLInputElement>("#timeScalePeriod")!;
        this.timeScaleLabel = document.querySelector<HTMLInputElement>("#timeScale")!;
        this.rewindButton = document.querySelector<HTMLInputElement>("#rewindButton")!;
        this.playPauseButton = document.querySelector<HTMLInputElement>("#playPauseButton")!;
        this.forwardButton = document.querySelector<HTMLInputElement>("#forwardButton")!;
        this.nowButton = document.querySelector<HTMLInputElement>("#nowButton")!;
        this.resetTimeScaleButton = document.querySelector<HTMLInputElement>("#resetTimeScaleButton")!;

        this.rewindButton.addEventListener("click", () => this.rewind());
        this.playPauseButton.addEventListener("click", () => this.playPause());
        this.forwardButton.addEventListener("click", () => this.forward());
        this.nowButton.addEventListener("click", () => this.now());
        this.resetTimeScaleButton.addEventListener("click", () => this.resetTimeScale());

        this.subscribeToTimeScale();

        this.bodySystem = bodySystem;
        this.dataService = dataService;
        this.scaleProvider = new TimeScaleProvider(this.bodySystem.getTimeScale());

        this.updateLabels();
        this.clockDateTimeInput = new ClockDateTimeInput("#datetimePicker", bodySystem)
            .onFinishChange((datetime: string | Date) => bodySystem.setSystemTime(datetime));

    }
    
    rewind(){
        this.bodySystem.setTimeScale(this.scaleProvider.prev());
    }

    isPaused(): boolean{
        return this.bodySystem.isPaused();
    }

    updateLabels(){
        const isPaused = this.isPaused();
        this.playPauseButton.innerHTML = isPaused? '<div class="blink">&gt;</div>': "||";
        this.timeScaleLabel.innerHTML = isPaused? '<div class="blink">Paused</div>': this.bodySystem.getTimeScale().toLocaleString().concat('X');
    }

    playPause(){
        const isPaused = this.bodySystem.setPaused(!this.bodySystem.isPaused());
        this.updateLabels();
    }

    forward(){
        this.bodySystem.setTimeScale(this.scaleProvider.next());
    }
    now(){
        // Given the bodies move, slowing down the time scale makes for a somewhat smoother transition.
        // But it would be cool to animate transition/move to new location of the body
        const now = new Date();
        const systemTime = new Date(this.bodySystem.clock.getTime());
        
        if (timeEquals(now, systemTime, TimeUnit.Seconds)){
            
            console.log("time equals\n"+now+"\n"+systemTime);
            return;
        }        
        console.log("time not equals\n"+now+"\n"+systemTime);

        const scale = this.bodySystem.getTimeScale();
        this.bodySystem.setTimeScale(1);
        this.bodySystem.setSystemTime(now);
        this.bodySystem.setTimeScale(scale);
    }
    resetTimeScale(){
        this.scaleProvider.setCurrentScale(1);
        this.bodySystem.setTimeScale(this.scaleProvider.current());        
    }


    subscribeToTimeScale(){
        this.timescaleSubscribtion = PubSub.subscribe(TIME_SCALE_TOPIC, (msg, scale) => {
            const timePeriod = unitsToTimePeriod(scale, TimeUnit.Seconds);            
            this.timeScalePeriodLabel.textContent = formatPeriod(timePeriod);
            this.timeScaleLabel.innerHTML = this.isPaused()? '<div class="blink">Paused</div>': scale.toLocaleString().concat('X');
        });
    }

    unsubscribeToTimeScale() {
        PubSub.unsubscribe(this.timescaleSubscribtion);
    }
}


/**
 * A terse UI...
 */
export class SimpleUI {

    constructor(statusElement: HTMLElement, bodySystem: BodySystem, dataService: DataService) {

        buildLilGui(statusElement, bodySystem, dataService);
        // new StatusComponent(statusElement, bodySystem);
        new TimeControls(bodySystem, dataService);

        // // Handle the history back button
        window.addEventListener('popstate', function (event) {
            if (event.state) {
                location.href = location.href;
            }
        });

        PubSub.subscribe(MOUSE_CLICK_ON_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
            if (pickEvent.body && pickEvent.body != bodySystem.getBodyObject3DTarget()) {
                bodySystem.moveToTarget(pickEvent.body);
            }
        });

    }
}

function getLocationFromBrowser(): Promise<LatLon> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject("Geolocation is not supported by your browser");
        } else {
            navigator.geolocation.getCurrentPosition(
                (position: any) => {
                    resolve(new LatLon(position.coords.latitude, position.coords.longitude))
                },
                () => {
                    reject("Unable to retrieve your location")
                }
            );
        }
    });
};

function withRollback(callback: (v: any)=>void){
    // Controllers pass in 'this' as their context to onFinishChange/onChange,
    // we manage the initialValue and call reset when exceptions are encountered.
    // The reset rolls back the value to initialValue.
    return function(v: any){
        try {
            callback.call(this, v);
            this.initialValue = v;
        }catch(e){
            this.reset();
        }
    };
}

function buildLilGui(statusElement: HTMLElement, bodySystem: BodySystem, dataService: DataService) {
    const gui = new GUI().title("Orri");
    const bodyNames = bodySystem.bodies.map((b) => b.name);

    const options = {

        target: bodySystem.getBodyObject3DTarget().getName() || "",
        sizeScale: 1.0,
        fov: bodySystem.getFov(),
        backgroudLightLevel: bodySystem.getAmbiantLightLevel(),
        showAxes: bodySystem.hasAxesHelper(),
        showNameLabels: bodySystem.isLayerEnabled(CameraLayer.NameLabel),
        showDistanceLabels: bodySystem.isLayerEnabled(CameraLayer.DistanceLabel),
        showAltitudeAzimuthLabels: bodySystem.isLayerEnabled(CameraLayer.ElevationAzimuthLabel),
        projectShadows: bodySystem.areShadowsEnabled(),
        shadowType: bodySystem.getShadowType(),
        distanceUnits: bodySystem.getDistanceUnit().abbrev,
        showStats: bodySystem.hasStats(),
        location: bodySystem.getLocation()?.toString() || "",
        targetingCameraMode: bodySystem.getCameraTargetingMode(),

        
        pushState() {
            const state = bodySystem.getState();
            LocationBar.pushState(state);
        },
        reloadState() {
            LocationBar.reload();
        },        
        getLocation() {
            getLocationFromBrowser().then(
                (l) => {
                    const v = `${l.lat}, ${l.lon}`;
                    locationController.setValue(v);
                    // not sure we need these calls
                    locationController.updateDisplay();
                    locationController._onFinishChange(v);
                },
                () => {
                    locationController.setValue(`Could not set.`);
                }
            );
        },
    };

 
    // const dateController = new ClockTimeUpdateHandler(gui.add(options, "date").name('Time'))
    //     .onFinishChange((datetime: string | Date) => bodySystem.setSystemTime(datetime));

    // gui.add(options, "setTimeToNow").name('Set Time To "Now"');        

    // const settings = gui.addFolder('Settings');        

    const targetController = gui.add(options, 'target', bodyNames).name("Target")
        .onFinishChange(withRollback( (targetName) => {
            try {
                bodySystem.moveToTarget(bodySystem.getBodyObject3D(targetName));
            }catch(e){
                userNotify.showWarning("You tried something weird...", (e as Error).message);
                throw(e);
            }
        }));

    const targetCameraModeController = gui.add(options, 'targetingCameraMode', CameraModes).name("Camera Mode")
        .onChange(withRollback( (v: CameraMode) => {        
            try {
                bodySystem.setCameraTargetingMode(v);
            }catch(e){
                userNotify.showWarning("You tried something weird...", (e as Error).message);                
                throw(e);
            }
        }));

    const fovController = gui.add(options, "fov", 0.05, 90, 0.1).name('Field Of Vue')
        .onChange((v: number) => bodySystem.setFOV(v));

    const labelsSettingsfolder = gui.addFolder('Labels Settings');
    labelsSettingsfolder.close();

    const showNameLabelsController = labelsSettingsfolder.add(options, "showNameLabels").name('Show Names')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.NameLabel));

    const showDistanceLabelsController = labelsSettingsfolder.add(options, "showDistanceLabels").name('Show Distances')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.DistanceLabel));

    labelsSettingsfolder.add(options, 'distanceUnits', DistanceUnits)
        .onChange((v: DistanceUnit) => bodySystem.setDistanceUnit(v));
   
    const showAltitudeAzimuthController = labelsSettingsfolder.add(options, "showAltitudeAzimuthLabels").name('Show Alt/Az')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.ElevationAzimuthLabel));

    const shadowsSettingsfolder = gui.addFolder('Eclipse/shadow Settings');     

    const projectShadowsController = shadowsSettingsfolder.add(options, "projectShadows").name('Cast Shadows')
        .onChange((v: boolean) => bodySystem.setShadowsEnabled(v));

    const shadowTypeController = shadowsSettingsfolder.add(options, "shadowType", ShadowType ).name('Shadow Type')
        .onChange((v: ShadowType) => bodySystem.setShadowType(v));        


    const locationFolder = gui.addFolder('Location Settings');
    const locationController = locationFolder.add(options, "location").name("Coordinates (lat, lon)").listen()
        .onFinishChange(withRollback( (v: string) => {
            try {
                const latlon = LatLon.fromString(v);
                bodySystem.setLocation(latlon);
                options.location = bodySystem.getLocation()?.toString() || "";
            }catch(e){
                userNotify.showWarning("I don't know where to pin your location...", (e as Error).message);
                throw(e);
            }
        }));


    locationFolder.add(options, "getLocation").name('Use Browser Location');
    
    const viewSettingsfolder = gui.addFolder('View Settings');
    
    const scaleController = viewSettingsfolder.add(options, "sizeScale", 1.0, 200.0, 0.1).name('Size Scale')
        .onChange((v: number) => bodySystem.setScale(v));

    const backgroundLightLevelController = viewSettingsfolder.add(options, "backgroudLightLevel", 0, 0.4, 0.01).name('Ambiant Light')
        .onChange((v: number) => bodySystem.setAmbiantLightLevel(v));

    const toolsFolder = gui.addFolder('Tools').close();        

    const showAxesController = toolsFolder.add(options, "showAxes").name('ICRS Axes')
        .onChange((v: boolean) => bodySystem.setAxesHelper(v));

    const showStatsController = toolsFolder.add(options, "showStats").name('Perf Stats')
        .onChange((v: boolean) => bodySystem.showStats(v));

    gui.add(options, "pushState").name('Push State to Location Bar and History');
    gui.add(options, "reloadState").name('Reload Pushed State');
    

    PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event) => {
        if (event.body && options.target != event.body.name) {
            targetController.setValue(event.body.getName()).updateDisplay();
        }
    });

    bodySystem.setTarget(targetController.getValue())

    return gui;
}





// /**
//  * A poor man implementation of some status.
//  */
// class StatusComponent {

//     hoveredBody?: BodyObject3D;

//     constructor(element: HTMLElement, bodySystem: BodySystem) {
//         /*
//         <div>
//             <div>
//                 Mouse over xxx at distance = ...
//             </div>
//         </div>
//         */

//         const statusDivElement= document.querySelector<HTMLInputElement>("#status1")!;
        

        

        
        

//         const updateHoveredElement = () => {
//             if (this.hoveredBody) {
//                 statusDivElement.textContent = `${this.hoveredBody!.getName()} at ${this.hoveredBody!.cameraDistanceAsString(true)} from surface.`;
//             }

//         };

//         PubSub.subscribe(MOUSE_HOVER_OVER_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
//             if (pickEvent.body) {
//                 this.hoveredBody = pickEvent.body;
//                 updateHoveredElement();
//             } else {
//                 this.hoveredBody = undefined;
//                 statusDivElement.textContent = "  ";
//             }
//         });

//         PubSub.subscribe(MOUSE_CLICK_ON_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
//             if (pickEvent.body && pickEvent.body != bodySystem.getBodyObject3DTarget()) {
//                 bodySystem.moveToTarget(pickEvent.body);
//             }
//         });
//     }
// }