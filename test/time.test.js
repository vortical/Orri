
import { expect, test } from 'vitest';


import { delay, Clock, Timer } from '../src/system/timing.ts';

test('time no scale ', async () => {

    const clock = new Clock();    
    const DELAY_MS = 100;

    let timeMs = clock.getTime();
    
    await delay(DELAY_MS);    
    expect(clock.getTime()).toBeGreaterThanOrEqual(timeMs+DELAY_MS);

    clock.setTime(timeMs+DELAY_MS+10000);
    expect(clock.getTime()).toBeGreaterThanOrEqual(timeMs+DELAY_MS+10000);

    await delay(DELAY_MS);
    expect(clock.getTime()).toBeGreaterThanOrEqual(timeMs+DELAY_MS +10000+DELAY_MS);
});


test('time scaled', async () => {
    const clock = new Clock();    
    const DELAY_MS = 100;
    const scale = 10;

    let timeMs = clock.getTime();

    clock.setScale(scale);
    await delay(DELAY_MS);
    expect(clock.getTime()).toBeGreaterThanOrEqual(timeMs+DELAY_MS*scale);

    clock.setScale(1);
    await delay(DELAY_MS);
    expect(clock.getTime()).toBeGreaterThanOrEqual(timeMs+DELAY_MS*scale+DELAY_MS);
});