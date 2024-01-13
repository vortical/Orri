import { Body } from './Body.ts';

interface BodySystemUpdater {
    update(bodies: Body[], timeStep: number): Body[]
}

export type { BodySystemUpdater }