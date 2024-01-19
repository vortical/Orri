import './style.css'

import { BodySystem } from './scene/BodySystem.ts'
import { bodySets } from './data/bodySystems.ts';
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import  GUI  from 'lil-gui';



console.log("starting....");


const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;


function buildGui(bodySystem: BodySystem){

    
    const gui = new GUI().title("planets");


    const bodyNames = bodySystem.bodies.map((b)=>b.name);

    let savedSettings = {};

    const options = {
        distance: 100000,
        target: "Earth",
        time: 1.0,
        scale: 1.0,
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
    const scaleController = gui.add(options, "scale", 1.0, 20.0, 0.1);
    const fovController = gui.add(options, "fov", 10, 70, 0.5)
    const backgroundLightLevelController = gui.add(options, "backgroudLightLevel", 0, 0.5, 0.01)
    const timeController = gui.add(options, "time", 0.1, 3600, 1); // 60 hours per second.
    const showAxesController = gui.add(options, "showAxes");


    gui.add(options, "saveSettings")
    const loadButton = gui.add(options, "loadSettings");
    loadButton.disable();

    showAxesController.onFinishChange((v: boolean) => {
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
        bodySystem.setTimeStep(v);
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
const bodySystem = new BodySystem(mainElement, bodySets.solarSystem, bodySystemUpdater);


buildGui(bodySystem);

bodySystem.start();

// bodySystem.setTarget(targetController.getValue())
    
    
    