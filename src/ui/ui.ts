import { BodySystem } from '../scene/BodySystem.ts'
import { CameraLayer } from '../scene/CameraLayer.ts';
import GUI from 'lil-gui';
import PubSub from 'pubsub-js';
import { MOUSE_CLICK_ON_BODY_TOPIC, BODY_SELECT_TOPIC } from '../system/event-types.ts';
import LocationBar from './LocationBar.ts';
import { PickerEvent } from '../scene/Picker.ts';


import { DataService } from '../services/dataservice.ts';
import { ShadowType } from '../domain/models.ts';


import { LatLon } from "../system/LatLon.ts";
import { CameraMode, CameraModes } from '../scene/CameraTargetingState.ts';
import { INotifyService, NotifyService } from './notify.ts';
import { DistanceUnit, DistanceUnits } from '../system/distance.ts';
import { TimeControls } from './TimeControls.ts';


export const userNotify: INotifyService = new NotifyService();


/**
 * A terse UI...
 */
export class SimpleUI {

    constructor(bodySystem: BodySystem, dataService: DataService) {

        buildLilGui(bodySystem, dataService);
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


/**
 * Manage the initialValue of lil-gui controllers, if an exception arises then
 * call reset on the lil-gui component: reset rolls back the value to initialValue.
 * 
 * @param callback 
 * @returns 
 */
function withRollback(callback: (v: any) => void) {
    return function (v: any) {
        try {
            callback.call(this, v);
            this.initialValue = v;
        } catch (e) {
            this.reset();
        }
    };
}

function buildLilGui(bodySystem: BodySystem, dataService: DataService) {
    const gui = new GUI().title("Settings");
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
            LatLon.fromBrowser().then(
                (l) => {
                    const v = `${l.lat}, ${l.lon}`;
                    locationController.setValue(v);
                    // not sure we need these calls
                    locationController.updateDisplay();
                    locationController._onFinishChange(v);
                },
                (e) => {
                    userNotify.showWarning("Could not get your location!", e.toString().concat(", You will need to add you coordinates manually in the settings."))
                    gui.open();

                    locationController.setValue('');
                }
            );
        },
    };

    const targetController = gui.add(options, 'target', bodyNames).name("Target")
        .onFinishChange(withRollback((targetName) => {
            try {
                bodySystem.moveToTarget(bodySystem.getBodyObject3D(targetName));
            } catch (e) {
                userNotify.showWarning("You tried something weird...", (e as Error).message);
                throw (e);
            }
        }));

    const targetCameraModeController = gui.add(options, 'targetingCameraMode', CameraModes).name("Camera Mode")
        .onChange(withRollback((v: CameraMode) => {
            try {
                bodySystem.setCameraTargetingMode(v);
            } catch (e) {
                userNotify.showWarning("You tried something weird...", (e as Error).message);
                throw (e);
            }
        }));


    const locationController = gui.add(options, "location").name("Coordinates (lat, lon)").listen()
        .onFinishChange(withRollback((v: string) => {
            try {
                const latlon = LatLon.fromString(v);
                bodySystem.setLocation(latlon);
                options.location = bodySystem.getLocation()?.toString() || "";
            } catch (e) {
                userNotify.showWarning("Can't process your location!", (e as Error).message);
                throw (e);
            }
        }));
    gui.add(options, "getLocation").name('Use Browser Location');

    const fovController = gui.add(options, "fov", 0.0001, 90, 0.0001).name('Field Of Vue')
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

    const shadowTypeController = shadowsSettingsfolder.add(options, "shadowType", ShadowType).name('Shadow Type')
        .onChange((v: ShadowType) => bodySystem.setShadowType(v));

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
    gui.close()
    return gui;
}