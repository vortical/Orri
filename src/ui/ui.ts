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

    const dateController = new ClockTimeUpdateHandler(gui.add(options, "date").name('DateTime (editable)'))
        .onFinishChange((datetime: string | Date) => setSystemTime(datetime));

    const settings = gui.addFolder('Settings');        

    settings.add(options, "setTimeToNow").name('Set Time To "Now"');        
    settings.add(options, "pushState").name('Push State to Location Bar and History');
    settings.add(options, "reloadState").name('Reload Pushed State');

    const targetController = settings.add(options, 'target', bodyNames).name("Target")
        .onFinishChange((targetName: string) => bodySystem.moveToTarget(bodySystem.getBodyObject3D(targetName)));

    const targetCameraModeController = settings.add(options, 'targetingCameraMode', CameraModes).name("Targeting Camera Mode")
        .onChange((v: CameraMode) => bodySystem.setCameraTargetingMode(v));
        

    const showNameLabelsController = settings.add(options, "showNameLabels").name('Show Names')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.NameLabel));

    const showDistanceLabelsController = settings.add(options, "showDistanceLabels").name('Show Distances')
        .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.DistanceLabel));


    const showAltitudeAzimujthLabelsController = settings.add(options, "showAltitudeAzimuthLabels").name('Show Alt/Az')
     .onChange((v: boolean) => bodySystem.setLayerEnabled(v, CameraLayer.ElevationAzimuthLabel));
        
    const projectShadowsController = settings.add(options, "projectShadows").name('Cast Shadows')
        .onChange((v: boolean) => bodySystem.setShadowsEnabled(v));

    const timeSettingsfolder = settings.addFolder('Time Settings');



    const timeScaleController = timeSettingsfolder.add(options, "timeScale", 0.1, 3600 * 24 * 30, 1).name('Time Scale')
        .onChange((v: number) => bodySystem.setTimeScale(v));

    timeSettingsfolder.add(options, "resetTimeScale").name('Reset Time Scale');

    const locationFolder = settings.addFolder('Location Settings');
    const locationController = locationFolder.add(options, "location").name("Coordinates (lat, lon)")
        .onFinishChange((v: string) => {
            //"43.302912, -73.6428032"
            const latlon = LatLon.fromString(v);

            if(latlon == undefined){
                locationController.setValue("'".concat(v,"' is not recognized."));
                // viewFromSurfaceLocationController.enable(false);
                return;

            }
            bodySystem.setLocation(latlon);
            updateViewFromSufaceController();
        });

    const updateViewFromSufaceController = () => {        
        // viewFromSurfaceLocationController.enable(bodySystem.getLocationPin() != undefined);
        
    }

    locationFolder.add(options, "getLocation").name('Use Browser Location');
    // const viewFromSurfaceLocationController = locationFolder.add(options, "viewFromSurfaceLocation").name("View From surface location")
    //     .onChange((v: boolean) => bodySystem.setViewFromSurfaceLocation(v));

    updateViewFromSufaceController();
    

    const viewSettingsfolder = settings.addFolder('View Settings');
    

    const scaleController = viewSettingsfolder.add(options, "sizeScale", 1.0, 200.0, 0.1).name('Size Scale')
        .onChange((v: number) => bodySystem.setScale(v));

    const fovController = viewSettingsfolder.add(options, "fov", 0.5, 100, 0.1).name('Field Of Vue (degrees)')
        .onChange((v: number) => bodySystem.setFOV(v));

    const backgroundLightLevelController = viewSettingsfolder.add(options, "backgroudLightLevel", 0, 0.4, 0.01).name('Ambiant Light')
        .onChange((v: number) => bodySystem.setAmbiantLightLevel(v));

    viewSettingsfolder.add(options, 'distanceUnits', DistanceUnits)
        .onChange((v: DistanceUnit) => bodySystem.setDistanceUnit(v));

    const toolsFolder = settings.addFolder('Tools').close();        

    const showAxesController = toolsFolder.add(options, "showAxes").name('ICRS Axes')
        .onChange((v: boolean) => bodySystem.setAxesHelper(v));

    const showStatsController = toolsFolder.add(options, "showStats").name('Perf Stats')
        .onChange((v: boolean) => bodySystem.showStats(v));

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