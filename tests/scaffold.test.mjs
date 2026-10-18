import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const game = readFileSync(new URL('../src/game.ts', import.meta.url),'utf8');
const app = readFileSync(new URL('../src/main.ts', import.meta.url),'utf8');
test('game contains case validation and bounded odds',()=>{assert.match(game,/INVALID_ROLL/);assert.match(game,/roll < 0\.7/);assert.match(game,/roll < 0\.95/);});
test('game contains safe loading and finite reward logic',()=>{assert.match(game,/safeLoad/);assert.match(game,/Number\.isSafeInteger/);assert.match(game,/INSUFFICIENT_CREDITS/);});
test('app has Russian and Ukrainian strings',()=>{assert.match(app,/ru:/);assert.match(app,/uk:/);assert.match(app,/localStorage/);});
