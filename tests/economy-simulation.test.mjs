import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const game = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { initialState, openCase, upgrade, race, safeLoad, CASE_COST, UPGRADE_COST } = game;

function makeRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

const STRATEGIES = [
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

function runStrategy(strategyId, seed, actions) {
  const strategy = STRATEGIES.find(item => item.id === strategyId);
  if (!strategy) throw new Error('UNKNOWN_STRATEGY');
  let state = initialState();
  const roll = makeRng(seed);
  for (let i = 0; i < actions; i++) {
    const selected = state.cars.find(car => car.id === state.selectedCarId && car.owned);
    const canUpgrade = selected && selected.power < 135 && state.credits >= strategy.upgradeReserve;
    const canOpenCase = state.credits >= strategy.caseThreshold;
    if (canUpgrade) {
      state = upgrade(state);
    } else if (canOpenCase) {
      state = selectBestOwnedCar(openCase(state, roll()));
    } else {
      state = race(state, roll()).state;
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
    cars: Object.fromEntries(state.cars.map(car => [car.id, car.owned]))
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function distribution(values) {
  return {
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9)
  };
}

function simulateCohort(actions, seeds = 64) {
  const result = {};
  for (const strategy of STRATEGIES) {
    const rows = Array.from({ length: seeds }, (_, i) =>
      summarize(runStrategy(strategy.id, 0xC0FFEE + i * 7919, actions))
    );
    const stat = key => distribution(rows.map(row => row[key]));
    result[strategy.id] = {
      runs: seeds,
      actions,
      credits: stat('credits'),
      xp: stat('xp'),
      wins: stat('racesWon'),
      carsOwned: stat('carsOwned'),
      averageLevel: rows.reduce((sum, row) => sum + row.level, 0) / rows.length,
      averageCases: rows.reduce((sum, row) => sum + row.casesOpened, 0) / rows.length,
      averageUpgrades: rows.reduce((sum, row) => sum + row.upgradesPurchased, 0) / rows.length,
      carOwnershipPercent: Object.fromEntries(
        ['comet', 'vortex', 'phantom'].map(id => [
          id,
          rows.filter(row => row.cars[id]).length * 100 / rows.length
        ])
      )
    };
  }
  return result;
}

test('threshold strategies produce percentile distributions at 1,000 and 10,000 actions', () => {
  const shortRun = simulateCohort(1_000);
  const longRun = simulateCohort(10_000);

  assert.deepEqual(
    summarize(runStrategy('cases', 12345, 1_000)),
    summarize(runStrategy('cases', 12345, 1_000)),
    'fixed seed must always produce the same result'
  );
  assert.deepEqual(simulateCohort(1_000), simulateCohort(1_000), 'whole cohort results must be reproducible');

  for (const [actions, cohort] of [[1_000, shortRun], [10_000, longRun]]) {
    assert.equal(Object.keys(cohort).length, STRATEGIES.length);
    for (const metrics of Object.values(cohort)) {
      assert.equal(metrics.runs, 64);
      assert.equal(metrics.actions, actions);
      for (const key of ['credits', 'xp', 'wins', 'carsOwned']) {
        const values = metrics[key];
        assert.ok(Number.isFinite(values.p10) && values.p10 >= 0, key + ' p10 must be finite and non-negative');
        assert.ok(Number.isFinite(values.median) && values.median >= values.p10, key + ' median must be >= p10');
        assert.ok(Number.isFinite(values.p90) && values.p90 >= values.median, key + ' p90 must be >= median');
      }
      assert.ok(metrics.carsOwned.p90 <= 3, 'garage contains only three defined cars');
      for (const percent of Object.values(metrics.carOwnershipPercent)) assert.ok(percent >= 0 && percent <= 100);
    }
  }

  assert.ok(longRun.save.wins.median > shortRun.save.wins.median);
  assert.ok(longRun.cases.credits.median >= 0);
  assert.ok(longRun['upgrade-first'].upgradesPurchased === undefined, 'summary intentionally exposes strategy averages rather than raw rows');
  assert.ok(longRun['upgrade-first'].averageUpgrades >= shortRun['upgrade-first'].averageUpgrades);

  console.log('ECONOMY_PERCENTILES_JSON=' + JSON.stringify({ actions1000: shortRun, actions10000: longRun }));
});

test('strategy thresholds spend only when their stated reserve is met', () => {
  const start = { ...initialState(), credits: CASE_COST - 1 };
  assert.throws(() => openCase(start, 0.1), /INSUFFICIENT_CREDITS/);
  assert.throws(() => upgrade({ ...start, credits: UPGRADE_COST - 1 }), /INSUFFICIENT_CREDITS/);
  for (const strategy of STRATEGIES) {
    const result = summarize(runStrategy(strategy.id, 42, 250));
    assert.ok(result.credits >= 0, strategy.id + ' must not create negative credits');
    assert.ok(result.carsOwned >= 1 && result.carsOwned <= 3);
  }
});

test('duplicate refunds are below case price and repeated duplicate cases lose net credits', () => {
  for (const [roll, refund] of [[0.1, 80], [0.7, 160], [0.95, 220]]) {
    let state = initialState();
    state = openCase(state, roll);
    const beforeDuplicate = state.credits;
    state = openCase(state, roll);
    assert.equal(state.credits, beforeDuplicate - CASE_COST + refund);
    assert.ok(state.credits < beforeDuplicate);
    assert.ok(refund < CASE_COST);
  }
});

test('legacy saves without new counters still migrate and derive level from XP', () => {
  const legacy = initialState();
  legacy.credits = 875;
  legacy.xp = 1_250;
  legacy.level = 1;
  legacy.cars[1].owned = true;
  delete legacy.casesOpened;
  delete legacy.racesWon;
  delete legacy.upgradesPurchased;
  const loaded = safeLoad(JSON.stringify(legacy));
  assert.equal(loaded.credits, 875);
  assert.equal(loaded.xp, 1_250);
  assert.equal(loaded.level, 13);
  assert.equal(loaded.cars.find(car => car.id === 'vortex').owned, true);
  assert.equal(loaded.casesOpened, 0);
  assert.equal(loaded.racesWon, 0);
  assert.equal(loaded.upgradesPurchased, 0);
});

test('malformed, extreme and invalid saves return bounded safe state', () => {
  assert.equal(safeLoad(null).credits, 1_000);
  assert.equal(safeLoad('{broken').credits, 1_000);
  assert.equal(safeLoad(JSON.stringify({ ...initialState(), credits: -1 })).credits, 1_000);
  const badCounters = safeLoad(JSON.stringify({
    ...initialState(), casesOpened: -1, racesWon: 'oops', upgradesPurchased: Number.MAX_SAFE_INTEGER
  }));
  assert.equal(badCounters.casesOpened, 0);
  assert.equal(badCounters.racesWon, 0);
  assert.equal(badCounters.upgradesPurchased, 0);
});

test('extreme gameplay counters saturate safely and case odds stay bounded', () => {
  const nearCap = { ...initialState(), credits: Number.MAX_SAFE_INTEGER - 1 };
  assert.equal(race(nearCap, 0.99).state.credits, Number.MAX_SAFE_INTEGER);
  for (const roll of [-1, 1, NaN, Infinity]) {
    assert.throws(() => openCase(initialState(), roll), /INVALID_ROLL/);
    assert.throws(() => race(initialState(), roll), /INVALID_ROLL/);
  }
  const state = openCase(initialState(), 0.999999999);
  assert.equal(state.cars.find(car => car.id === 'phantom').owned, true);
  assert.equal(state.casesOpened, 1);
});
