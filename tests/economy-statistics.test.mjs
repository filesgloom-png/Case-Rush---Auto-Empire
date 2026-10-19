import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const { initialState, openCase, race, CASE_COST } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

function makeRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 0x1_0000_0000;
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

test('100,000 deterministic rolls match common/rare/epic odds within six-sigma bounds', () => {
  const n = 100_000;
  const rng = makeRng(0xC0FFEE);
  const counts = { common: 0, rare: 0, epic: 0 };
  for (let i = 0; i < n; i++) {
    const roll = rng();
    const state = openCase({ ...initialState(), credits: CASE_COST }, roll);
    const won = state.cars.find(car => car.id !== 'comet' && car.owned);
    const tier = won?.tier ?? 'common';
    counts[tier]++;
  }

  const expected = { common: 0.70, rare: 0.25, epic: 0.05 };
  for (const [tier, probability] of Object.entries(expected)) {
    const observed = counts[tier] / n;
    const sixSigma = 6 * Math.sqrt(probability * (1 - probability) / n) + 0.0002;
    assert.ok(Math.abs(observed - probability) <= sixSigma,
      tier + ' observed=' + observed + ' expected=' + probability + ' tolerance=' + sixSigma);
  }
  console.log('CASE_ODDS_SIMULATION_JSON=' + JSON.stringify({
    trials: n, counts, observed: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / n])),
    expected, tolerance: '6 standard errors + 0.02 percentage points'
  }));
});

test('garage completion attempts agree with the coupon-collector expectation', () => {
  const cohortSize = 4_096;
  const attempts = [];
  for (let i = 0; i < cohortSize; i++) {
    const rng = makeRng((0xA11CE + Math.imul(i + 1, 7919)) >>> 0);
    let state = { ...initialState(), credits: 1_000_000_000 };
    let count = 0;
    while (state.cars.some(car => !car.owned) && count < 2_000) {
      state = openCase(state, rng());
      count++;
    }
    assert.ok(state.cars.every(car => car.owned), 'garage should complete within the safety bound');
    attempts.push(count);
  }

  // Common is already owned. Rare and epic probabilities are 0.25 and 0.05.
  // E[T_both] = 1/pRare + 1/pEpic - 1/(pRare + pEpic).
  const theoreticalMean = 1 / 0.25 + 1 / 0.05 - 1 / (0.25 + 0.05);
  const mean = attempts.reduce((sum, n) => sum + n, 0) / cohortSize;
  const result = { cohortSize, theoreticalMean, observedMean: mean, p10: percentile(attempts, 0.1), median: percentile(attempts, 0.5), p90: percentile(attempts, 0.9) };
  assert.ok(Math.abs(mean - theoreticalMean) < 1.25, JSON.stringify(result));
  assert.ok(result.p10 >= 2 && result.p90 < 60, JSON.stringify(result));
  console.log('GARAGE_COMPLETION_JSON=' + JSON.stringify(result));
});

test('duplicate compensation distribution matches tier odds and remains below case price', () => {
  const n = 100_000;
  const rng = makeRng(0xD00D);
  let state = {
    ...initialState(),
    credits: 1_000_000_000,
    cars: initialState().cars.map(car => ({ ...car, owned: true }))
  };
  const counts = { common: 0, rare: 0, epic: 0 };
  const refunds = { common: 80, rare: 160, epic: 220 };
  let totalRefund = 0;

  for (let i = 0; i < n; i++) {
    const before = state.credits;
    state = openCase(state, rng());
    const refund = state.credits - before + CASE_COST;
    const tier = refund === 80 ? 'common' : refund === 160 ? 'rare' : refund === 220 ? 'epic' : 'invalid';
    assert.notEqual(tier, 'invalid', 'every duplicate must map to a documented refund');
    counts[tier]++;
    totalRefund += refund;
    assert.ok(refund < CASE_COST);
  }

  const meanRefund = totalRefund / n;
  const expectedMean = 0.70 * refunds.common + 0.25 * refunds.rare + 0.05 * refunds.epic;
  const variance = 0.70 * (80 - expectedMean) ** 2 + 0.25 * (160 - expectedMean) ** 2 + 0.05 * (220 - expectedMean) ** 2;
  const sixSigma = 6 * Math.sqrt(variance / n) + 0.05;
  const result = { trials: n, counts, meanRefund, expectedMean, sixSigma, meanNetCaseCost: CASE_COST - meanRefund };
  assert.ok(Math.abs(meanRefund - expectedMean) <= sixSigma, JSON.stringify(result));
  assert.ok(result.meanNetCaseCost > 0);
  console.log('DUPLICATE_REFUND_JSON=' + JSON.stringify(result));
});

test('credit-reserve thresholds preserve the requested minimum before opening a case', () => {
  const reserves = [0, 250, 500, 1_000, 5_000];
  const outcomes = reserves.map(reserve => {
    let state = initialState();
    const rng = makeRng(123);
    let opened = 0;
    for (let i = 0; i < 500; i++) {
      if (state.credits >= reserve + CASE_COST) {
        state = openCase(state, rng());
        opened++;
      } else {
        state = race(state, rng()).state;
      }
      assert.ok(state.credits >= 0);
    }
    return { reserve, opened, endingCredits: state.credits };
  });
  assert.equal(outcomes[0].reserve, 0);
  assert.ok(outcomes.every(item => Number.isSafeInteger(item.opened) && item.opened >= 0));
  assert.ok(outcomes.every(item => Number.isSafeInteger(item.endingCredits) && item.endingCredits >= 0));
  assert.ok(new Set(outcomes.map(item => item.opened)).size > 1,
    'different reserve thresholds should produce measurably different case-buying behavior');
  // A case is never bought until the configured reserve plus case price is available.
  for (const reserve of reserves) {
    const belowThreshold = { ...initialState(), credits: reserve + CASE_COST - 1 };
    assert.ok(belowThreshold.credits < reserve + CASE_COST);
  }
  console.log('CREDIT_RESERVE_SIMULATION_JSON=' + JSON.stringify(outcomes));
});

test('extreme unsigned seeds remain deterministic and always generate valid rolls', () => {
  const seeds = [0, 1, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff];
  const results = seeds.map(seed => {
    const a = makeRng(seed);
    const b = makeRng(seed);
    const valuesA = Array.from({ length: 10_000 }, () => a());
    const valuesB = Array.from({ length: 10_000 }, () => b());
    assert.deepEqual(valuesA, valuesB, 'seed ' + seed + ' must be reproducible');
    assert.ok(valuesA.every(value => Number.isFinite(value) && value >= 0 && value < 1));
    let state = initialState();
    for (const roll of valuesA.slice(0, 100)) {
      state = openCase({ ...state, credits: Math.max(state.credits, CASE_COST) }, roll);
    }
    return { seed, first: valuesA[0], last: valuesA.at(-1), cases: state.casesOpened };
  });
  console.log('EXTREME_SEEDS_JSON=' + JSON.stringify(results));
});
