import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const game = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { initialState, openCase, upgrade, race, safeLoad, CASE_COST, UPGRADE_COST } = game;

test('new player gets a safe starter balance and one owned car', () => {
  const s = initialState();
  assert.equal(s.credits, 1000);
  assert.equal(s.cars.filter(c => c.owned).length, 1);
  assert.equal(s.selectedCarId, 'comet');
});
test('case odds choose the correct tier at every boundary', () => {
  assert.equal(openCase(initialState(), 0).cars.find(c => c.owned && c.id === 'comet').id, 'comet');
  assert.equal(openCase(initialState(), 0.699999).cars.find(c => c.id === 'comet').owned, true);
  assert.equal(openCase(initialState(), 0.7).cars.find(c => c.id === 'vortex').owned, true);
  assert.equal(openCase(initialState(), 0.949999).cars.find(c => c.id === 'vortex').owned, true);
  assert.equal(openCase(initialState(), 0.95).cars.find(c => c.id === 'phantom').owned, true);
});
test('opening a case deducts its price exactly once', () => {
  const next = openCase(initialState(), 0.7);
  assert.equal(next.credits, 1000 - CASE_COST);
  assert.equal(next.cars.find(c => c.id === 'vortex').owned, true);
});
test('duplicate cars pay the documented compensation', () => {
  const first = openCase(initialState(), 0.1);
  const second = openCase(first, 0.2);
  assert.equal(second.credits, first.credits - CASE_COST + 80);
  assert.match(second.history[0], /\(\+credits\)/);
});
test('invalid case rolls are rejected', () => {
  for (const roll of [-0.01, 1, NaN, Infinity]) assert.throws(() => openCase(initialState(), roll), /INVALID_ROLL/);
});
test('case and upgrade cannot spend unavailable credits', () => {
  const poor = { ...initialState(), credits: 0 };
  assert.throws(() => openCase(poor, 0.1), /INSUFFICIENT_CREDITS/);
  assert.throws(() => upgrade(poor), /INSUFFICIENT_CREDITS/);
});
test('upgrade charges credits and adds ten power to the selected owned car', () => {
  const s = initialState();
  const next = upgrade(s);
  assert.equal(next.credits, s.credits - UPGRADE_COST);
  assert.equal(next.cars.find(c => c.id === 'comet').power, s.cars.find(c => c.id === 'comet').power + 10);
});
test('locked car cannot be upgraded by changing the selected id', () => {
  const s = { ...initialState(), selectedCarId: 'phantom' };
  assert.throws(() => upgrade(s), /NO_CAR/);
});
test('race reward is deterministic for a fixed roll and never negative', () => {
  const s = initialState();
  const loss = race(s, 0);
  const win = race(s, 0.99);
  assert.equal(loss.won, false);
  assert.equal(loss.state.credits, s.credits + 50);
  assert.equal(win.won, true);
  assert.equal(win.state.credits, s.credits + 180);
  assert.equal(win.state.xp, 25);
});
test('race rejects invalid random values', () => {
  for (const roll of [-1, 1, NaN]) assert.throws(() => race(initialState(), roll), /INVALID_ROLL/);
});
test('empty and malformed saves restore a valid initial state', () => {
  assert.equal(safeLoad(null).credits, 1000);
  assert.equal(safeLoad('{bad json').credits, 1000);
  assert.equal(safeLoad(JSON.stringify({ credits: -5, cars: [], history: [], language: 'ru' })).credits, 1000);
});
test('valid save restores progress but clamps invalid car and level fields', () => {
  const s = initialState();
  s.credits = 7654;
  s.language = 'uk';
  s.cars[1].owned = true;
  s.cars[1].power = 1000000;
  s.level = -10;
  const loaded = safeLoad(JSON.stringify(s));
  assert.equal(loaded.credits, 7654);
  assert.equal(loaded.language, 'uk');
  assert.equal(loaded.cars.find(c => c.id === 'vortex').owned, true);
  assert.equal(loaded.cars.find(c => c.id === 'vortex').power, 160);
  assert.equal(loaded.level, 1);
});
test('history is filtered and limited to twenty entries', () => {
  const s = initialState();
  s.history = Array.from({ length: 30 }, (_, i) => i % 2 ? 'race' : 12);
  const loaded = safeLoad(JSON.stringify(s));
  assert.equal(loaded.history.length, 15);
  assert.ok(loaded.history.every(x => typeof x === 'string'));
});


test('progress counters increment only for successful gameplay actions', () => {
  const start = initialState();
  const opened = openCase(start, 0.7);
  assert.equal(opened.casesOpened, 1);
  assert.equal(start.casesOpened, 0);
  const tuned = upgrade(start);
  assert.equal(tuned.upgradesPurchased, 1);
  assert.equal(start.upgradesPurchased, 0);
  assert.equal(race(start, 0.99).state.racesWon, 1);
  assert.equal(race(start, 0).state.racesWon, 0);
});
test('legacy saves migrate progress counters safely and corrupted counters are clamped', () => {
  const legacy = initialState();
  delete legacy.casesOpened; delete legacy.racesWon; delete legacy.upgradesPurchased;
  const migrated = safeLoad(JSON.stringify(legacy));
  assert.equal(migrated.casesOpened, 0);
  assert.equal(migrated.racesWon, 0);
  assert.equal(migrated.upgradesPurchased, 0);
  const bad = safeLoad(JSON.stringify({ ...initialState(), casesOpened: -4, racesWon: 'many', upgradesPurchased: 1e99 }));
  assert.equal(bad.casesOpened, 0);
  assert.equal(bad.racesWon, 0);
  assert.equal(bad.upgradesPurchased, 0);
});


test('duplicate compensation never reaches or exceeds the case price', () => {
  const start = initialState();
  const rareOnce = openCase(start, 0.7);
  const rareDuplicate = openCase(rareOnce, 0.7);
  assert.equal(rareDuplicate.credits, rareOnce.credits - CASE_COST + 160);
  const epicOnce = openCase(start, 0.95);
  const epicDuplicate = openCase(epicOnce, 0.95);
  assert.equal(epicDuplicate.credits, epicOnce.credits - CASE_COST + 220);
  assert.ok(80 < CASE_COST);
  assert.ok(160 < CASE_COST);
  assert.ok(220 < CASE_COST);
});
test('opening repeated rare and epic cases cannot create credits from the refund alone', () => {
  for (const [roll, refund] of [[0.7, 160], [0.95, 220]]) {
    let state = initialState();
    state = openCase(state, roll);
    const before = state.credits;
    state = openCase(state, roll);
    assert.equal(state.credits, before - CASE_COST + refund);
    assert.ok(state.credits < before);
  }
});
test('case rolls immediately below one stay within the epic tier', () => {
  const result = openCase(initialState(), 0.999999999);
  assert.equal(result.cars.find(c => c.id === 'phantom').owned, true);
  assert.equal(result.casesOpened, 1);
});


test('10,000 consecutive wins have deterministic long-run economy and XP', () => {
  let state = initialState();
  for (let i = 0; i < 10_000; i++) state = race(state, 0.99).state;
  assert.equal(state.credits, 1_801_000);
  assert.equal(state.xp, 250_000);
  assert.equal(state.level, 2_501);
  assert.equal(state.racesWon, 10_000);
});
test('race probability follows power thresholds without changing reward values', () => {
  const start = initialState();
  assert.equal(race(start, 0.39).won, false);
  assert.equal(race(start, 0.4).won, true);
  const oneUpgrade = upgrade(start);
  assert.equal(race(oneUpgrade, 0.22).won, false);
  assert.equal(race(oneUpgrade, 0.23).won, true);
  const twoUpgrades = upgrade(oneUpgrade);
  assert.equal(race(twoUpgrades, 0.05).won, false);
  assert.equal(race(twoUpgrades, 0.06).won, true);
  const threeUpgrades = upgrade(twoUpgrades);
  assert.equal(race(threeUpgrades, 0).won, true);
});
test('upgrade boundary rejects non-safe or over-limit power and stops at 10,000', () => {
  const atLimit = { ...initialState(), cars: initialState().cars.map(c => c.id === 'comet' ? { ...c, power: 9990 } : c) };
  assert.equal(upgrade(atLimit).cars.find(c => c.id === 'comet').power, 10000);
  assert.throws(() => upgrade({ ...atLimit, cars: atLimit.cars.map(c => c.id === 'comet' ? { ...c, power: 10000 } : c) }), /MAX_UPGRADE/);
  assert.throws(() => upgrade({ ...atLimit, cars: atLimit.cars.map(c => c.id === 'comet' ? { ...c, power: Number.MAX_SAFE_INTEGER } : c) }), /MAX_UPGRADE/);
});
test('race credits saturate safely and XP never exceeds the supported save limit', () => {
  const rich = { ...initialState(), credits: Number.MAX_SAFE_INTEGER - 10 };
  assert.equal(race(rich, 0.99).state.credits, Number.MAX_SAFE_INTEGER);
  const maxXp = { ...initialState(), xp: 1_000_000_000, level: 10_000_001 };
  const result = race(maxXp, 0.99).state;
  assert.equal(result.xp, 1_000_000_000);
  assert.equal(result.level, 10_000_001);
});
test('save migration derives level from XP and safely handles maximum valid XP', () => {
  const legacy = { ...initialState(), xp: 999_999, level: 2 };
  const loaded = safeLoad(JSON.stringify(legacy));
  assert.equal(loaded.xp, 999_999);
  assert.equal(loaded.level, 10_000);
  const maximum = safeLoad(JSON.stringify({ ...initialState(), xp: 1_000_000_000, level: 100_000 }));
  assert.equal(maximum.xp, 1_000_000_000);
  assert.equal(maximum.level, 10_000_001);
});
test('extreme invalid credits, XP, and progress counters are handled without unsafe arithmetic', () => {
  const invalidXp = { ...initialState(), xp: Number.MAX_SAFE_INTEGER };
  const repaired = race(invalidXp, 0.99).state;
  assert.equal(repaired.xp, 1_000_000_000);
  const counters = { ...initialState(), casesOpened: 1_000_000_000, racesWon: 1_000_000_000, upgradesPurchased: 1_000_000_000 };
  assert.equal(openCase(counters, 0.1).casesOpened, 1_000_000_000);
  assert.equal(race(counters, 0.99).state.racesWon, 1_000_000_000);
  assert.equal(upgrade(counters).upgradesPurchased, 1_000_000_000);
});
