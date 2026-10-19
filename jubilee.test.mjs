import assert from 'node:assert/strict';
import {fitState, diningPresentation, trail} from './docs/jubilee.mjs';

export function verifyJubilee() {
  let checks = 0;
  for (const people of [1, 2]) for (const vessel of ['trial', 'compact']) for (let reach = 0; reach <= 100; reach++) {
    const result = fitState(people, vessel, reach);
    assert(['ready', 'close', 'room', 'alone'].includes(result.key)); checks++;
    assert.equal(typeof result.title, 'string'); checks++;
    assert.equal(typeof result.copy, 'string'); checks++;
    if (reach < 35) { assert.equal(result.key, 'ready'); checks++; }
    if (people === 2 && vessel === 'trial' && reach > 55) { assert.equal(result.key, 'close'); checks++; }
    if (people === 1) { assert.notEqual(result.key, 'close'); checks++; }
    if (vessel === 'compact') { assert.notEqual(result.key, 'close'); checks++; }
    const presentation = diningPresentation(people, vessel, reach);
    assert.equal(presentation.key, result.key); checks++;
    assert.equal(presentation.close, result.key === 'close'); checks++;
    assert(presentation.reachSize >= 18 && presentation.reachSize <= 43); checks++;
    assert(presentation.reachOpacity >= 0 && presentation.reachOpacity <= .85); checks++;
    assert(presentation.message.length > 0); checks++;
  }
  for (const args of [[0,'trial',1],[3,'compact',80],[2,'unknown',80],[2,'trial',-1],[2,'trial',101],[2,'trial',NaN],[2,'trial',Infinity],[2,'trial','90']]) { assert.throws(() => fitState(...args), RangeError); checks++; }
  assert.throws(() => diningPresentation(2, 'trial', NaN), RangeError); checks++;
  assert.deepEqual(trail.map(item => item.episode), [0,13,18,21,37,50]); checks++;
  for (const item of trail) { assert(item.episode <= 50 && item.episode >= 0 && item.copy.length > 0 && item.label.length > 0); checks++; }
  assert(Object.isFrozen(trail)); checks++;
  return checks;
}
if (process.argv[1]?.endsWith('jubilee.test.mjs')) console.log(JSON.stringify({jubileeModelChecks:verifyJubilee()}));
