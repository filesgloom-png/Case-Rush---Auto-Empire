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

function selectBestOwnedCar(state) {
  const owned = state.cars.filter(car => car.owned);
  owned.sort((a, b) => (b.power + b.handling * 0.4) - (a.power + a.handling * 0.4));
  return { ...state, selectedCarId: owned[0].id };
}

function runStrategy(strategy, seed, actions) {
  let state = initialState();
  const roll = makeRng(seed);
  for (let i = 0; i < actions; i++) {
    if (strategy === 'save') {
      state = race(state, roll()).state;
    } else if (strategy === 'cases') {
      if (state.credits >= CASE_COST) {
        state = selectBestOwnedCar(openCase(state, roll()));
      } else {
        state = race(state, roll()).state;
      }
    } else if (strategy === 'upgrade-first') {
      const selected = state.cars.find(car => car.id === state.selectedCarId && car.owned);
      if (selected && selected.power < 135 && state.credits >= UPGRADE_COST) {
        state = upgrade(state);
      } else {
        state = race(state, roll()).state;
      }
    } else {
      throw new Error('UNKNOWN_STRATEGY');
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
    cars: Object.fromEntries(state.cars.map(car => [car.id, car.owned]))
  };
}

function simulateCohort(actions, seeds = 64) {
  const strategies = ['save', 'cases', 'upgrade-first'];
  const result = {};
  for (const strategy of strategies) {
    const rows = Array.from({ length: seeds }, (_, i) => summarize(runStrategy(strategy, 0xC0FFEE + i * 7919, actions)));
    const average = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
    result[strategy] = {
      runs: seeds,
      actions,
      averageCredits: average('credits'),
      averageXp: average('xp'),
      averageLevel: average('level'),
      averageWins: average('racesWon'),
      averageCases: average('casesOpened'),
      averageUpgrades: average('upgradesPurchased'),
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

test('deterministic economy simulation compares saving, cases, and upgrade-first for 1,000 and 10,000 actions', () => {
  const shortRun = simulateCohort(1_000);
  const longRun = simulateCohort(10_000);
  assert.deepEqual(
    summarize(runStrategy('cases', 12345, 1_000)),
    summarize(runStrategy('cases', 12345, 1_000)),
    'fixed seed must always produce the same result'
  );

  for (const cohort of [shortRun, longRun]) {
    for (const metrics of Object.values(cohort)) {
      assert.equal(metrics.runs, 64);
      assert.equal(metrics.actions, cohort === shortRun ? 1_000 : 10_000);
      for (const key of ['averageCredits', 'averageXp', 'averageLevel', 'averageWins', 'averageCases', 'averageUpgrades']) {
        assert.ok(Number.isFinite(metrics[key]) && metrics[key] >= 0, key + ' must be finite and non-negative');
      }
      for (const percent of Object.values(metrics.carOwnershipPercent)) {
        assert.ok(percent >= 0 && percent <= 100);
      }
    }
  }

  assert.ok(longRun.save.averageWins > shortRun.save.averageWins);
  assert.ok(longRun.cases.averageCases >= shortRun.cases.averageCases);
  assert.ok(longRun['upgrade-first'].averageUpgrades >= shortRun['upgrade-first'].averageUpgrades);

  // Fixed cohort snapshots make balance, progression, and strategy trade-offs regression-testable.
  const pick = metrics => [metrics.averageCredits, metrics.averageXp, metrics.averageWins, metrics.averageCases, metrics.averageUpgrades];
  assert.deepEqual(
    Object.fromEntries(Object.entries(shortRun).map(([strategy, metrics]) => [strategy, pick(metrics)])),
    {
      save: [129127.96875, 19014.765625, 600.984375, 0, 0],
      cases: [258.28125, 11047.890625, 441.796875, 557.90625, 0],
      'upgrade-first': [179560, 24925, 997, 0, 3]
    }
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(longRun).map(([strategy, metrics]) => [strategy, pick(metrics)])),
    {
      save: [1288397.8125, 190853.59375, 6056.90625, 0, 0],
      cases: [265.3125, 110654.53125, 4426.0625, 5573.640625, 0],
      'upgrade-first': [1799560, 249925, 9997, 0, 3]
    }
  );
  console.log('ECONOMY_SIMULATION_JSON=' + JSON.stringify({ actions1000: shortRun, actions10000: longRun }));
});

test('legacy saves without economy counters remain loadable and derive level from XP', () => {
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
