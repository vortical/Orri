import './style.css';
import { BodySystem } from './scene/BodySystem.ts'
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import { Body } from './domain/Body.ts';
import { SimpleUI } from './ui/ui.ts';
import LocationBar from './ui/LocationBar.ts';
import { DataService } from './services/dataservice.ts';
import config from './configuration.ts';

console.log(`Config: \n${JSON.stringify(config)}`);
const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;

const dataService = new DataService(config.spacefieldBaseURL, config.baseUrl);
const bodySystemUpdater = new NBodySystemUpdater();
const options = LocationBar.getState();
const date = options.date ? new Date(options.date) : new Date()
const bodies: Body[] = await dataService.loadSolarSystem(date);
const bodySystem = new BodySystem(mainElement, bodies, dataService, bodySystemUpdater, options);
bodySystem.setCameraUp(bodySystem.getBody("earth").get_orbital_plane_normal());
const ui = new SimpleUI(bodySystem, dataService);
bodySystem.start();
