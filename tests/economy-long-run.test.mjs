import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const { initialState, openCase, upgrade, race, CASE_COST, UPGRADE_COST } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

function makeRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

const strategies = [
  { id: 'save', caseThreshold: Infinity, upgradeReserve: Infinity },
  { id: 'cases', caseThreshold: CASE_COST, upgradeReserve: Infinity },
  { id: 'cases-reserve-1000', caseThreshold: 1_000 + CASE_COST, upgradeReserve: Infinity },
  { id: 'upgrade-first', caseThreshold: Infinity, upgradeReserve: UPGRADE_COST },
  { id: 'upgrade-reserve-500', caseThreshold: Infinity, upgradeReserve: UPGRADE_COST + 500 },
  { id: 'balanced', caseThreshold: 1_000, upgradeReserve: UPGRADE_COST + 300 }
];

function selectBestOwnedCar(state) {
  const owned = state.cars.filter(car => car.owned);
  owned.sort((a, b) => (b.power + b.handling * 0.4) - (a.power + a.handling * 0.4));
  return { ...state, selectedCarId: owned[0].id };
}

function runStrategy(strategy, seed, actions) {
  let state = initialState();
  const rng = makeRng(seed);
  for (let i = 0; i < actions; i++) {
    const selected = state.cars.find(car => car.id === state.selectedCarId && car.owned);
    const canUpgrade = selected && selected.power < 135 && state.credits >= strategy.upgradeReserve;
    const canOpenCase = state.credits >= strategy.caseThreshold;
    if (canUpgrade) {
      state = upgrade(state);
    } else if (canOpenCase) {
      state = selectBestOwnedCar(openCase(state, rng()));
    } else {
      state = race(state, rng()).state;
    }
  }
  return state;
}

function summarize(state) {
  return {
    credits: state.credits,
    xp: state.xp,
    level: state.level,
    racesWon: state.racesWon,
    casesOpened: state.casesOpened,
    upgradesPurchased: state.upgradesPurchased,
    carsOwned: state.cars.filter(car => car.owned).length,
    carPower: state.cars.find(car => car.id === state.selectedCarId)?.power ?? 0
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

function metrics(states) {
  const rows = states.map(summarize);
  const stat = key => ({
    p10: percentile(rows.map(row => row[key]), 0.1),
    median: percentile(rows.map(row => row[key]), 0.5),
    p90: percentile(rows.map(row => row[key]), 0.9)
  });
  return {
    runs: rows.length,
    actions: 100_000,
    credits: stat('credits'),
    xp: stat('xp'),
    wins: stat('racesWon'),
    casesOpened: stat('casesOpened'),
    upgradesPurchased: stat('upgradesPurchased'),
    carsOwned: stat('carsOwned'),
    medianLevel: stat('level').median,
    medianSelectedCarPower: stat('carPower').median
  };
}

test('six strategies remain reproducible and bounded over 100,000 actions across eight seeds', () => {
  const results = {};
  for (const strategy of strategies) {
    const states = [];
    for (let i = 0; i < 8; i++) {
      const seed = (0x51A7E + Math.imul(i + 1, 104729)) >>> 0;
      const state = runStrategy(strategy, seed, 100_000);
      states.push(state);
      assert.ok(Number.isSafeInteger(state.credits) && state.credits >= 0, strategy.id + ' credits');
      assert.ok(Number.isSafeInteger(state.xp) && state.xp >= 0 && state.xp <= 1_000_000_000, strategy.id + ' XP');
      assert.ok(state.cars.every(car => typeof car.owned === 'boolean' && car.power >= 0 && car.power <= 10_000));
      assert.ok(state.cars.filter(car => car.owned).length >= 1);
      assert.ok(state.casesOpened >= 0 && state.racesWon >= 0 && state.upgradesPurchased >= 0);
    }
    const repeated = runStrategy(strategy, (0x51A7E + Math.imul(1, 104729)) >>> 0, 100_000);
    assert.deepEqual(summarize(repeated), summarize(states[0]), strategy.id + ' must be reproducible for the same seed');
    results[strategy.id] = metrics(states);
  }

  assert.ok(results.save.wins.median > 0);
  assert.ok(results.cases.casesOpened.median > 0);
  assert.ok(results['upgrade-first'].upgradesPurchased.median >= 3);
  assert.ok(results.balanced.carsOwned.median >= 1 && results.balanced.carsOwned.median <= 3);
  console.log('LONG_RUN_100K_JSON=' + JSON.stringify(results));
});

test('100,000 races measure win probability and XP tempo at starter and upgraded power', () => {
  const trials = 100_000;
  const expected = [
    { name: 'starter', power: 105, probability: 1 - (155 - (105 + 66 * 0.4)) / 60 },
    { name: 'one-upgrade', power: 115, probability: 1 - (155 - (115 + 66 * 0.4)) / 60 }
  ];
  const results = [];

  for (const scenario of expected) {
    const rng = makeRng(0xBEEF + scenario.power);
    let state = initialState();
    state.credits = 1_000_000;
    state.cars = state.cars.map(car => car.id === 'comet' ? { ...car, power: scenario.power } : car);
    let wins = 0;
    for (let i = 0; i < trials; i++) {
      const outcome = race(state, rng());
      state = outcome.state;
      if (outcome.won) wins++;
    }

    const observed = wins / trials;
    const tolerance = 6 * Math.sqrt(scenario.probability * (1 - scenario.probability) / trials) + 0.001;
    const expectedXp = trials * 10 + wins * 15;
    const result = {
      name: scenario.name,
      trials,
      wins,
      observedWinRate: observed,
      expectedWinRate: scenario.probability,
      tolerance,
      xp: state.xp,
      expectedXp,
      level: state.level
    };
    assert.ok(Math.abs(observed - scenario.probability) <= tolerance, JSON.stringify(result));
    assert.equal(state.xp, expectedXp, 'XP must equal 10 per race plus 15 per win');
    assert.equal(state.level, 1 + Math.floor(expectedXp / 100));
    results.push(result);
  }

  let maxed = initialState();
  maxed.credits = 10_000;
  maxed = upgrade(upgrade(upgrade(maxed)));
  const guaranteedRaces = 1_000;
  const rng = makeRng(777);
  let guaranteedWins = 0;
  for (let i = 0; i < guaranteedRaces; i++) {
    const outcome = race(maxed, rng());
    maxed = outcome.state;
    if (outcome.won) guaranteedWins++;
  }
  assert.equal(guaranteedWins, guaranteedRaces, 'three starter-car upgrades put every roll above the win threshold');
  results.push({ name: 'three-upgrades', trials: guaranteedRaces, wins: guaranteedWins, observedWinRate: 1 });

  console.log('WIN_XP_TEMPO_JSON=' + JSON.stringify(results));
});
