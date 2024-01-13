import './style.css'

import { BodySystem } from './scene/BodySystem.ts'
import { bodyGroups } from './data/bodySystems.ts';
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';

console.log("starting....");

const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;

const bodies = bodyGroups.solarSystem;
const bodySystemUpdater = new NBodySystemUpdater()
const bodySystem = new BodySystem(mainElement, bodies, bodySystemUpdater);
bodySystem.start();

