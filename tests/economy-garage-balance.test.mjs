import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const { initialState, openCase, race, upgrade, CASE_COST, UPGRADE_COST } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

function makeRng(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(1664525, value) + 1013904223) >>> 0) / 0x1_0000_0000);
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}

function summary(values) {
  return {
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9)
  };
}

function assertValidState(state, label) {
  assert.ok(Number.isSafeInteger(state.credits) && state.credits >= 0, label + ': credits');
  assert.ok(Number.isSafeInteger(state.xp) && state.xp >= 0 && state.xp <= 1_000_000_000, label + ': XP');
  assert.ok(state.cars.length === 3 && state.cars.every(car => typeof car.owned === 'boolean'), label + ': garage');
  assert.ok(state.cars.every(car => Number.isSafeInteger(car.power) && car.power >= 0 && car.power <= 10_000), label + ': power');
  assert.ok(Number.isSafeInteger(state.upgradesPurchased) && state.upgradesPurchased >= 0, label + ': upgrades');
  assert.ok(Number.isSafeInteger(state.casesOpened) && state.casesOpened >= 0, label + ': cases');
  assert.ok(Number.isSafeInteger(state.racesWon) && state.racesWon >= 0, label + ': wins');
}

test('full-garage probability is measured at fixed budgets with duplicate refunds included', () => {
  const budgets = [1_000, 2_500, 5_000, 10_000, 25_000];
  const trials = 4096;
  const rows = [];
  const completionBySeed = Array.from({ length: trials }, () => []);

  for (const budget of budgets) {
    let completed = 0;
    let totalCases = 0;
    let totalRefund = 0;
    for (let i = 0; i < trials; i++) {
      let state = { ...initialState(), credits: budget };
      const roll = makeRng((0xA771 + Math.imul(i + 1, 7919)) >>> 0);
      let safety = 0;
      while (state.credits >= CASE_COST && safety < 10_000) {
        const before = state.credits;
        state = openCase(state, roll());
        totalRefund += Math.max(0, state.credits - before + CASE_COST);
        safety++;
        assertValidState(state, 'budget=' + budget + ', trial=' + i);
      }
      assert.ok(safety < 10_000, 'budget simulation must terminate');
      const full = state.cars.every(car => car.owned);
      if (full) completed++;
      completionBySeed[i].push(full);
      totalCases += state.casesOpened;
    }
    rows.push({
      budget,
      trials,
      fullGarageProbability: completed / trials,
      completedRuns: completed,
      meanCasesOpened: totalCases / trials,
      meanDuplicateRefundPerRun: totalRefund / trials
    });
  }

  for (let i = 0; i < trials; i++) {
    let previouslyFull = false;
    for (const result of completionBySeed[i]) {
      assert.ok(!previouslyFull || result, 'larger budgets must preserve the same-roll garage completion outcome');
      previouslyFull = result;
    }
  }
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].fullGarageProbability >= rows[i - 1].fullGarageProbability,
      'completion probability must not decrease as budget grows');
  }
  console.log('FIXED_BUDGET_GARAGE_JSON=' + JSON.stringify(rows));
});

test('starter, rare, epic and strongest-owned car selection are compared over fixed race rolls', () => {
  const trials = 100_000;
  const base = initialState();
  const scenarios = [
    { id: 'starter', carId: 'comet', power: 105, handling: 66 },
    { id: 'rare', carId: 'vortex', power: 160, handling: 74 },
    { id: 'epic', carId: 'phantom', power: 230, handling: 82 },
    { id: 'strongest-owned', carId: 'phantom', power: 230, handling: 82 }
  ];
  const results = scenarios.map((scenario, index) => {
    let state = {
      ...base,
      credits: 1_000_000,
      cars: base.cars.map(car => car.id === scenario.carId
        ? { ...car, owned: true, power: scenario.power, handling: scenario.handling }
        : { ...car, owned: car.id === 'comet' })
    };
    state = { ...state, selectedCarId: scenario.carId };
    const roll = makeRng(0xC0DE + index);
    let wins = 0;
    for (let i = 0; i < trials; i++) {
      const result = race(state, roll());
      state = result.state;
      if (result.won) wins++;
    }
    const expected = Math.max(0, Math.min(1,
      (scenario.power + scenario.handling * 0.4 + 60 - 155) / 60));
    const observed = wins / trials;
    const tolerance = 6 * Math.sqrt(expected * (1 - expected) / trials) + 0.001;
    assert.ok(Math.abs(observed - expected) <= tolerance,
      JSON.stringify({ scenario: scenario.id, observed, expected, tolerance }));
    assertValidState(state, scenario.id);
    return { policy: scenario.id, trials, wins, observedWinRate: observed, theoreticalWinRate: expected, tolerance, credits: state.credits, xp: state.xp };
  });
  assert.ok(results.find(row => row.policy === 'rare').observedWinRate >= results[0].observedWinRate);
  assert.ok(results.find(row => row.policy === 'epic').observedWinRate >= results[0].observedWinRate);
  console.log('CAR_SELECTION_RACE_JSON=' + JSON.stringify(results));
});

function runSpendingStrategy(strategy, seed, actions = 2500) {
  let state = initialState();
  const roll = makeRng(seed);
  for (let action = 0; action < actions; action++) {
    const starter = state.cars.find(car => car.id === 'comet');
    const garageFull = state.cars.every(car => car.owned);
    let operation = 'race';
    if (strategy === 'upgrades-only') {
      if (starter.power < 135 && state.credits >= UPGRADE_COST) operation = 'upgrade';
    } else if (strategy === 'cases-only') {
      if (!garageFull && state.credits >= CASE_COST) operation = 'case';
    } else if (strategy === 'upgrade-before-cases') {
      if (starter.power < 135 && state.credits >= UPGRADE_COST) operation = 'upgrade';
      else if (!garageFull && state.credits >= CASE_COST) operation = 'case';
    } else if (strategy === 'cases-before-upgrades') {
      if (!garageFull && state.credits >= CASE_COST) operation = 'case';
      else if (starter.power < 135 && state.credits >= UPGRADE_COST) operation = 'upgrade';
    } else if (strategy === 'reserve-1000') {
      if (!garageFull && state.credits >= CASE_COST + 1_000) operation = 'case';
      else if (starter.power < 135 && state.credits >= UPGRADE_COST + 1_000) operation = 'upgrade';
    }

    if (operation === 'upgrade') {
      state = { ...state, selectedCarId: 'comet' };
      state = upgrade(state);
    } else if (operation === 'case') {
      state = openCase(state, roll());
    } else {
      state = race({ ...state, selectedCarId: 'comet' }, roll()).state;
    }
    assertValidState(state, strategy + ':' + action);
  }
  return {
    credits: state.credits,
    xp: state.xp,
    wins: state.racesWon,
    cases: state.casesOpened,
    upgrades: state.upgradesPurchased,
    carsOwned: state.cars.filter(car => car.owned).length,
    starterPower: state.cars.find(car => car.id === 'comet').power
  };
}

test('spending strategies are deterministic and preserve economy invariants across seeds', () => {
  const strategies = ['upgrades-only', 'cases-only', 'upgrade-before-cases', 'cases-before-upgrades', 'reserve-1000'];
  const runs = {};
  for (const strategy of strategies) {
    const rows = [];
    for (let i = 0; i < 32; i++) {
      const seed = (0xBADA55 + Math.imul(i + 1, 104729)) >>> 0;
      rows.push(runSpendingStrategy(strategy, seed));
    }
    const replay = runSpendingStrategy(strategy, (0xBADA55 + 104729) >>> 0);
    assert.deepEqual(replay, rows[0], strategy + ' must replay for the same seed');
    runs[strategy] = {
      seeds: rows.length,
      credits: summary(rows.map(row => row.credits)),
      xp: summary(rows.map(row => row.xp)),
      wins: summary(rows.map(row => row.wins)),
      cases: summary(rows.map(row => row.cases)),
      upgrades: summary(rows.map(row => row.upgrades)),
      carsOwned: summary(rows.map(row => row.carsOwned)),
      starterPower: summary(rows.map(row => row.starterPower))
    };
  }
  assert.ok(runs['upgrades-only'].upgrades.median >= 3);
  assert.ok(runs['cases-only'].cases.median > 0);
  assert.ok(runs['reserve-1000'].credits.p10 >= 0);
  console.log('SPENDING_STRATEGIES_P10_MEDIAN_P90_JSON=' + JSON.stringify(runs));
});

test('isolated upgrade-price and car-power sensitivity uses measured win rates without changing source constants', () => {
  const trials = 100_000;
  const powers = [95, 105, 115, 125, 135, 160, 230];
  const powerResults = [];
  for (const power of powers) {
    const car = initialState().cars[0];
    const roll = makeRng(0xB00B + power);
    let wins = 0;
    for (let i = 0; i < trials; i++) {
      if (power + car.handling * 0.4 + roll() * 60 >= 155) wins++;
    }
    const expected = Math.max(0, Math.min(1, (power + car.handling * 0.4 + 60 - 155) / 60));
    const observed = wins / trials;
    const tolerance = 6 * Math.sqrt(expected * (1 - expected) / trials) + 0.001;
    assert.ok(Math.abs(observed - expected) <= tolerance,
      JSON.stringify({ power, observed, expected, tolerance }));
    powerResults.push({ power, wins, observedWinRate: observed, theoreticalWinRate: expected, expectedCreditsPerRace: 50 + 130 * expected });
  }

  const baseline = powerResults.find(row => row.power === 105);
  const oneUpgrade = powerResults.find(row => row.power === 115);
  const uplift = oneUpgrade.expectedCreditsPerRace - baseline.expectedCreditsPerRace;
  assert.ok(uplift > 0);
  const hypotheticalPrices = [150, UPGRADE_COST, 450, 600];
  const payback = hypotheticalPrices.map(price => ({
    hypotheticalUpgradePrice: price,
    additionalCreditsPerRace: uplift,
    breakEvenRaces: Math.ceil(price / uplift)
  }));
  for (let i = 1; i < payback.length; i++) {
    assert.ok(payback[i].breakEvenRaces >= payback[i - 1].breakEvenRaces);
  }
  assert.equal(CASE_COST, 250, 'the real case price must remain unchanged');
  assert.equal(UPGRADE_COST, 300, 'the real upgrade price must remain unchanged');
  let actual = { ...initialState(), credits: 1_000 };
  actual = upgrade(actual);
  assert.equal(actual.credits, 1_000 - UPGRADE_COST);
  assert.equal(actual.cars.find(car => car.id === 'comet').power, 115);
  console.log('POWER_AND_PRICE_SENSITIVITY_JSON=' + JSON.stringify({ trials, powerResults, payback }));
});
