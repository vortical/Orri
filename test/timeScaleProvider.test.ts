import { assert, expect, test } from 'vitest';
import { TimeScaleProvider } from '../src/ui/TimeScaleProvider.ts';

test('test zero scale ', () => {
    const timeScaleProvider = new TimeScaleProvider(0);
    const current = timeScaleProvider.current();
    expect(current).toEqual(0);
});

test('test scale next ', () => {
    const timeScaleProvider = new TimeScaleProvider(0);
    const scale = timeScaleProvider.next();
    expect(scale).toEqual(timeScaleProvider.timeScales[1]);
});

test('test scale next has upper limit ', () => {
    const timeScaleProvider = new TimeScaleProvider(0);
    for (let i = 0; i < 100; i++) {
        timeScaleProvider.next();
    }
    const scale = timeScaleProvider.next();
    expect(scale).toEqual(timeScaleProvider.timeScales[timeScaleProvider.timeScales.length - 1]);
});

test('test scale prev  ', () => {
    const timeScaleProvider = new TimeScaleProvider(0);
    const scale = timeScaleProvider.prev();
    expect(scale).toEqual(-1 * timeScaleProvider.timeScales[1]);
});

test('test scale prev has upper limit ', () => {
    const timeScaleProvider = new TimeScaleProvider(0);
    for (let i = 0; i < 100; i++) {
        timeScaleProvider.prev();
    }
    const scale = timeScaleProvider.prev();
    expect(scale).toEqual(-1 * timeScaleProvider.timeScales[timeScaleProvider.timeScales.length - 1]);
});

test('test scale next from lower bound', () => {
    const timeScaleProvider = new TimeScaleProvider(0);

    for (let i = 0; i < 100; i++) {
        timeScaleProvider.prev();
    }

    for (let i = 0; i < 100; i++) {
        timeScaleProvider.next();
    }
    const scale = timeScaleProvider.next();
    expect(scale).toEqual(timeScaleProvider.timeScales[timeScaleProvider.timeScales.length - 1]);

});

test('test scale prev from higher bound', () => {
    const timeScaleProvider = new TimeScaleProvider(0);

    for (let i = 0; i < 100; i++) {
        timeScaleProvider.next();
    }

    for (let i = 0; i < 100; i++) {
        timeScaleProvider.prev();
    }
    const scale = timeScaleProvider.prev();
    expect(scale).toEqual(-1 * timeScaleProvider.timeScales[timeScaleProvider.timeScales.length - 1]);
});

test('test scale from an existing positive scale value ', () => {

    const timeScaleProvider = new TimeScaleProvider(1);
    const current = timeScaleProvider.current();
    expect(current).toEqual(1);
    const scale = timeScaleProvider.next();
    expect(scale).toEqual(timeScaleProvider.timeScales[2]);
});

test('test scale from an non existing positive scale value ', () => {

    const timeScaleProvider = new TimeScaleProvider(2);
    const current = timeScaleProvider.current();
    expect(current).toEqual(2);
    const scale = timeScaleProvider.next();
    expect(scale).toEqual(timeScaleProvider.timeScales[2]);
});

test('test scale from an non existing negative scale value ', () => {

    const timeScaleProvider = new TimeScaleProvider(-2);
    const current = timeScaleProvider.current();
    expect(current).toEqual(-2);
    const scale = timeScaleProvider.prev();
    expect(scale).toEqual(-1 * timeScaleProvider.timeScales[2]);
});


test('test scale from a positive value exceeding upper limit', () => {

    const timeScaleProvider = new TimeScaleProvider(2e22);
    // we honor the initial value?
    const current = timeScaleProvider.current();

    expect(current).toEqual(timeScaleProvider.timeScales[timeScaleProvider.timeScales.length - 1]);
});

test('test scale from a negative value exceeding upper limit', () => {

    const timeScaleProvider = new TimeScaleProvider(-2e22);
    const current = timeScaleProvider.current();

    expect(current).toEqual(-1 * timeScaleProvider.timeScales[timeScaleProvider.timeScales.length - 1]);
});
