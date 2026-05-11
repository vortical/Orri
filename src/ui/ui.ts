import { BodySystem } from '../scene/BodySystem.ts';
import PubSub from 'pubsub-js';
import { MOUSE_CLICK_ON_BODY_TOPIC } from '../system/event-types.ts';
import { PickerEvent } from '../scene/Picker.ts';

import { INotifyService, NotifyService } from './notify.ts';

export const userNotify: INotifyService = new NotifyService();

/**
 * App-level UI wiring: browser-history navigation and click-to-target.
 * Settings UI lives in `src/ui/components/Sidebar.svelte`.
 */
export class SimpleUI {
    constructor(bodySystem: BodySystem) {
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                location.href = location.href;
            }
        });

        PubSub.subscribe(MOUSE_CLICK_ON_BODY_TOPIC, (_msg: string, pickEvent: PickerEvent) => {
            if (pickEvent.body && pickEvent.body != bodySystem.getRenderableBodyTarget()) {
                bodySystem.moveToTarget(pickEvent.body);
            }
        });
    }
}
