import './style.css'

import { BodySystem, BodySystemOptionsState } from './scene/BodySystem.ts'
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import { Body} from './domain/Body.ts';
import { SimpleUI } from './ui/ui.ts';
import LocationBar from './ui/LocationBar.ts';
import { DataService } from './services/dataservice.ts';
import config from './configuration.ts';
import { BodiesAtTimeUpdater } from './body/BodiesAtTimeUpdater.ts';

const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;
const statusElement =document.querySelector<HTMLInputElement>("#status-container")!;

async function start(){
    const dataService = new DataService(config.spacefield_host)
    const bodySystemUpdater = new NBodySystemUpdater();
    const options = LocationBar.getState();
    const date = options.date ? new Date(options.date): new Date()
    const bodies: Body[] = await dataService.loadSolarSystem(date);
    const bodySystem = new BodySystem(mainElement, bodies, bodySystemUpdater, options);

    // set the up of the viewer to be perpendicular to earth's orbit
    const earth = bodySystem.getBody("earth");
    bodySystem.setCameraUp(earth.get_orbital_plane_normal());
    const ui = new SimpleUI(statusElement, bodySystem, dataService);
    bodySystem.start();
}

try {
    const environment = import.meta.env;
    start();
}catch(err: any) {
    console.error("Could not start application:"+ err.message)
};