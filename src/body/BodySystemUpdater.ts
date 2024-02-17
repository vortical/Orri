import { Body } from './Body.ts';
import { TimePeriod } from '../body/models.ts'
import { Clock } from '../system/timing.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';

interface BodySystemUpdater {
    update(bodies: BodyObject3D[], timeStepmS: number, clock: Clock): BodyObject3D[]
}

export type { BodySystemUpdater }