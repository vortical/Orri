import { BodySystem, CameraLayer } from '../scene/BodySystem.ts'
import GUI, { Controller } from 'lil-gui';
import PubSub from 'pubsub-js';
import { SYSTEM_TIME_TOPIC, MOUSE_HOVER_OVER_BODY_TOPIC, MOUSE_CLICK_ON_BODY_TOPIC, BODY_SELECT_TOPIC } from '../system/event-types.ts';
import LocationBar from './LocationBar.ts';
import { PickerEvent } from '../scene/Picker.ts';
import { throttle } from "../system/timing.ts";
import { ClockTimeUpdateHandler } from './ClockTimeUpdateHandler.ts';
import { BodiesAtTimeUpdater } from '../body/BodiesAtTimeUpdater.ts';
import { DataService } from '../services/dataservice.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { DistanceUnit, DistanceUnits, LatLon } from '../system/geometry.ts';
import { CameraMode, CameraModes } from '../scene/CameraTargetingState.ts';
import { INotifyService, NotifyService } from './notify.ts';

import { ShadowType} from '../mesh/Umbra.ts';

// import { Toast } from "toaster-js"; 



const userNotify: INotifyService = new NotifyService();
    
    



/**
 * A terse UI...
 */
export class SimpleUI {

    constructor(statusElement: HTMLElement, bodySystem: BodySystem, dataService: DataService) {

        buildLilGui(statusElement, bodySystem, dataService);
        new StatusComponent(statusElement, bodySystem);

        // // Handle the history back button
        window.addEventListener('popstate', function (event) {
            if (event.state) {
                location.href = location.href;
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
        date: "",
        target: bodySystem.getBodyObject3DTarget().getName() || "",
        timeScale: bodySystem.getTimeScale(),
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
        setTimeToNow() {
            timeScaleController.setValue(1);
            setSystemTime(new Date());
        },
        resetTimeScale() {
            timeScaleController.setValue(1);
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

    function setSystemTime(datetime: string | Date) {
        return new Promise(async (resolve) => {
            try {
                const time = new Date(datetime);
                const kinematics = await dataService.loadKinematics(Array.from(bodySystem.bodyObjects3D.keys()), time);
                bodySystem.addUpdater(new BodiesAtTimeUpdater(kinematics, time));

            } catch (e) {
                console.log(e)
            }
        });
    }

    const dateController = new ClockTimeUpdateHandler(gui.add(options, "date").name('Time (click to change)'))
        .onFinishChange((datetime: string | Date) => setSystemTime(datetime));

    gui.add(options, "setTimeToNow").name('Set Time To "Now"');        

    const settings = gui.addFolder('Settings');        



    const targetController = settings.add(options, 'target', bodyNames).name("Target")
        .onFinishChange(withRollback( (targetName) => {
            try {
                bodySystem.moveToTarget(bodySystem.getBodyObject3D(targetName));
            }catch(e){
                userNotify.showWarning("You tried something weird...", (e as Error).message);
                throw(e);
            }
        }));

    const targetCameraModeController = settings.add(options, 'targetingCameraMode', CameraModes).name("Camera Mode")
        .onChange(withRollback( (v: CameraMode) => {        
            try {
                bodySystem.setCameraTargetingMode(v);
            }catch(e){
                userNotify.showWarning("You tried something weird...", (e as Error).message);                
                throw(e);
            }
        }));

    const fovController = settings.add(options, "fov", 0.05, 90, 0.1).name('Field Of Vue')
        .onChange((v: number) => bodySystem.setFOV(v));

    const labelsSettingsfolder = settings.addFolder('Labels Settings');

    const showNameLabelsController = labelsSettingsfolder.add(options, "showNameLabels").name('Show Names')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.NameLabel));

    const showDistanceLabelsController = labelsSettingsfolder.add(options, "showDistanceLabels").name('Show Distances')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.DistanceLabel));

    labelsSettingsfolder.add(options, 'distanceUnits', DistanceUnits)
        .onChange((v: DistanceUnit) => bodySystem.setDistanceUnit(v));
   
    const showAltitudeAzimuthController = labelsSettingsfolder.add(options, "showAltitudeAzimuthLabels").name('Show Alt/Az')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.ElevationAzimuthLabel));


    const shadowsSettingsfolder = settings.addFolder('Eclipse/shadow Settings');     


    const projectShadowsController = shadowsSettingsfolder.add(options, "projectShadows").name('Cast Shadows')
        .onChange((v: boolean) => bodySystem.setShadowsEnabled(v));


    const shadowTypeController = shadowsSettingsfolder.add(options, "shadowType", ShadowType ).name('Shadow Type')
        .onChange((v: ShadowType) => bodySystem.setShadowType(v));        

    const timeSettingsfolder = settings.addFolder('Time Settings');

    const timeScaleController = timeSettingsfolder.add(options, "timeScale", 0.1, 3600 * 24 * 30, 1).name('Time Scale')
        .onChange((v: number) => bodySystem.setTimeScale(v));

    timeSettingsfolder.add(options, "resetTimeScale").name('Reset Time Scale');

    const locationFolder = settings.addFolder('Location Settings');
    const locationController = locationFolder.add(options, "location").name("Coordinates (lat, lon)").listen()
        .onFinishChange(withRollback( (v: string) => {
            //"43.302912, -73.6428032"
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
    

    const viewSettingsfolder = settings.addFolder('View Settings');
    

    const scaleController = viewSettingsfolder.add(options, "sizeScale", 1.0, 200.0, 0.1).name('Size Scale')
        .onChange((v: number) => bodySystem.setScale(v));




    const backgroundLightLevelController = viewSettingsfolder.add(options, "backgroudLightLevel", 0, 0.4, 0.01).name('Ambiant Light')
        .onChange((v: number) => bodySystem.setAmbiantLightLevel(v));


    const toolsFolder = settings.addFolder('Tools').close();        

    const showAxesController = toolsFolder.add(options, "showAxes").name('ICRS Axes')
        .onChange((v: boolean) => bodySystem.setAxesHelper(v));

    const showStatsController = toolsFolder.add(options, "showStats").name('Perf Stats')
        .onChange((v: boolean) => bodySystem.showStats(v));

    settings.add(options, "pushState").name('Push State to Location Bar and History');
    settings.add(options, "reloadState").name('Reload Pushed State');
    

    PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event) => {
        if (event.body && options.target != event.body.name) {
            targetController.setValue(event.body.getName()).updateDisplay();
        }
    });

    bodySystem.setTarget(targetController.getValue())

    return gui;
}





/**
 * A poor man implementation of some status.
 */
class StatusComponent {

    hoveredBody?: BodyObject3D;

    constructor(element: HTMLElement, bodySystem: BodySystem) {
        /*
        <div>
            <div>
                target distance = ...
            </div>
            <br>
            <div>
                Mouse over xxx at distance = ...
            </div>
        </div>
        */

        const statusDivElement = document.createElement('div');
        const targetElement = document.createElement('div');
        const hoverElement = document.createElement('div');
        statusDivElement.appendChild(targetElement)
        statusDivElement.appendChild(document.createElement('br'));
        statusDivElement.appendChild(hoverElement);
        element.appendChild(statusDivElement);

        bodySystem.controls.addEventListener("change", throttle(200, undefined, (e) => {

            const targetText = `Target distance is ${bodySystem.getDistanceFormatter().format(bodySystem.controls.getDistance())}`;
            targetElement.innerHTML = targetText;
            updateHoveredElement();
        }));

        const updateHoveredElement = () => {
            if (this.hoveredBody) {
                hoverElement.textContent = `${this.hoveredBody!.getName()} at ${this.hoveredBody!.cameraDistanceAsString(true)} from surface.`;
            }

        };

        PubSub.subscribe(MOUSE_HOVER_OVER_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
            if (pickEvent.body) {
                this.hoveredBody = pickEvent.body;
                updateHoveredElement();
            } else {
                this.hoveredBody = undefined;
                hoverElement.textContent = "  ";
            }
        });

        PubSub.subscribe(MOUSE_CLICK_ON_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
            if (pickEvent.body && pickEvent.body != bodySystem.getBodyObject3DTarget()) {
                bodySystem.moveToTarget(pickEvent.body);
            }
        });
    }
}