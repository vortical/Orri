import './style.css'

import { BodySystem } from './scene/BodySystem.ts'
import { bodySets } from './data/bodySystems.ts';
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import  GUI  from 'lil-gui';



console.log("starting....");


const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;


function buildGui(bodySystem: BodySystem){

    const options = {
        distance: 100000,
        target: "Earth",
        time: 1.0,
        scale: 1.0,
    };
    
    const gui = new GUI().title("planets");

    const bodyNames = bodySystem.bodies.map((b)=>b.name);

    
    const targetController = gui.add(options, 'target', bodyNames).listen();
    const scaleController = gui.add(options, "scale", 1.0, 200.0, 0.1);
    const timeController = gui.add(options, "time", 0.1, 3600, 1); // 60 hours per second.

    targetController.onFinishChange((targetName: string)=> {
        bodySystem.setTarget(targetName);
        // bodySystem.setTargetAnimated(targetName);
    
    });
    
    scaleController.onChange((v:number) => {
        bodySystem.setScale(v);
    })
    
    timeController.onChange((v: number) => {
        bodySystem.setTimeStep(v);
    });

    bodySystem.setTarget(targetController.getValue())

    return gui;
    
}
        
const bodySystemUpdater = new NBodySystemUpdater();
const bodySystem = new BodySystem(mainElement, bodySets.solarSystem, bodySystemUpdater);
buildGui(bodySystem);

bodySystem.start();

// bodySystem.setTarget(targetController.getValue())
    
    
    