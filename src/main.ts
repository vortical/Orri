import './style.css'

import { BodySystem } from './scene/BodySystem.ts'
import { DataService } from './data/bodySystems.ts';
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import  GUI  from 'lil-gui';
import PubSub from 'pubsub-js';
import { SYSTEM_TIME_TOPIC } from './system/event-types.ts';



console.log("starting....");


const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;
const datetimePickerElement = document.querySelector<HTMLInputElement>("#system-time")!;

function buildGui(bodySystem: BodySystem){

    
    const gui = new GUI().title("planets");


    const bodyNames = bodySystem.bodies.map((b)=>b.name);

    let savedSettings = {};

    const options = {
        distance: 100000,
        target: "Earth",
        timeScale: 1.0,
        sizeScale: 1.0,
        fov: bodySystem.camera.fov,
        backgroudLightLevel: bodySystem.ambiantLight.intensity,
        showAxes: bodySystem.hasAxesHelper(),
        saveSettings() {
            savedSettings = gui.save();

            loadButton.enable();
        },
        loadSettings() {
            gui.load(savedSettings);
        }
    };
    


    const targetController = gui.add(options, 'target', bodyNames).listen();
    const scaleController = gui.add(options, "sizeScale", 1.0, 400.0, 0.1).name( 'Scale celestial objects sizes');
    const fovController = gui.add(options, "fov", 10, 70, 0.5).name( 'Field Of Vue (degrees)')
    const backgroundLightLevelController = gui.add(options, "backgroudLightLevel", 0, 0.5, 0.01)
    const timeController = gui.add(options, "timeScale", 0.1, 3600 * 24 * 30, 1).name( 'Time multiplier'); // 3600 * 24 * 30 is 30 days per second.
    const showAxesController = gui.add(options, "showAxes");


    gui.add(options, "saveSettings")
    const loadButton = gui.add(options, "loadSettings");
    loadButton.disable();

    showAxesController.onChange((v: boolean) => {
        bodySystem.setAxesHelper(v);
    });

    targetController.onFinishChange((targetName: string)=> {
        bodySystem.setTarget(targetName);
        // bodySystem.setTargetAnimated(targetName);
    
    });
    
    scaleController.onChange((v:number) => {
        bodySystem.setScale(v);
    });
    
    timeController.onChange((v: number) => {
        bodySystem.setTimeScale(v);
    });

    fovController.onChange((v: number) => {
        bodySystem.setFOV(v);
    });

    backgroundLightLevelController.onChange((v: number) => {
        bodySystem.setAmbiantLightLevel(v);
    });

    bodySystem.setTarget(targetController.getValue())

    return gui;
    
}
        
const bodySystemUpdater = new NBodySystemUpdater();
const bodySystem = new BodySystem(mainElement, DataService.loadSolarSystem(), bodySystemUpdater);


buildGui(bodySystem);


const timeSubscriber = function(msg, timeMs){
    // console.log("got time: "+ msg + "data:"+timeMs);
    datetimePickerElement.value = new Date(timeMs).toISOString().slice(0, -5)+'Z';
};

function subscribeToTime(): string {
    return PubSub.subscribe(SYSTEM_TIME_TOPIC, timeSubscriber);
}

let timeSubscription = subscribeToTime();


datetimePickerElement?.addEventListener("change", (event) => {
    bodySystem.setDatetime(event.target.value);
    console.log("Change Selected date:", event.target.value);
});

datetimePickerElement?.addEventListener("focus", (event) => {
    PubSub.unsubscribe(timeSubscription);
    console.log("Focus Selected date:", event.target.value);
});

datetimePickerElement?.addEventListener("blur", (event) => {
    timeSubscription = subscribeToTime();
    console.log("Blur Selected date:", event.target.value);
});

datetimePickerElement?.addEventListener("keydown", function(event) {
    // Check if the Enter key is pressed
    if (event.keyCode === 13) {
        datetimePickerElement.blur();
    }
  });

bodySystem.start();

// bodySystem.setTarget(targetController.getValue())
    
    
    