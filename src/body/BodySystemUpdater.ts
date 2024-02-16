import { Body } from './Body.ts';
import { TimePeriod } from '../body/models.ts'
import { Clock } from '../system/timing.ts';

interface BodySystemUpdater {
    update(bodies: Body[], timeStepmS: number, clock: Clock): Body[]
}

export type { BodySystemUpdater }