import { expect, test } from 'vitest';
import { zipCombine } from '../src/system/functions';


test('Zip with arrays of same length', () => {
    const r = zipCombine([1, 2, 3], [4, 5, 6], (a, b) => a * b);
    expect(r.length).to.equal(3);
    expect(r).toEqual([1 * 4, 2 * 5, 3 * 6]);
});

