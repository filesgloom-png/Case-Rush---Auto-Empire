import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { initialState, openCase, race, upgrade, CASE_COST, UPGRADE_COST } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

function rng(seed) {
  let x = seed >>> 0;
  return () => ((x = (Math.imul(1664525, x) + 1013904223) >>> 0) / 4294967296);
}
const fraction = (rows, predicate) => rows.filter(predicate).length / rows.length;
const approx = (actual, expected, n, margin = 0.012) => assert.ok(Math.abs(actual - expected) <= 6 * Math.sqrt(expected * (1 - expected) / n) + margin, JSON.stringify({ actual, expected, n }));

test('fixed-budget garage completion matches exact coupon probabilities', () => {
  const trials = 4096;
  const result = [];
  for (const cases of [2, 5, 10, 20, 40, 80]) {
    const rows = [];
    for (let i = 0; i < trials; i++) {
      let state = { ...initialState(), credits: cases * CASE_COST };
      const roll = rng((0xA771 + Math.imul(i + 1, 7919)) >>> 0);
      for (let j = 0; j < cases; j++) state = openCase(state, roll());
      rows.push(state);
    }
    const full = fraction(rows, state => state.cars.every(car => car.owned));
    const rare = fraction(rows, state => state.cars.find(car => car.id === 'vortex').owned);
    const epic = fraction(rows, state => state.cars.find(car => car.id === 'phantom').owned);
    const theoretical = 1 - 0.75 ** cases - 0.95 ** cases + 0.70 ** cases;
    approx(full, theoretical, trials);
    approx(rare, 1 - 0.75 ** cases, trials);
    approx(epic, 1 - 0.95 ** cases, trials);
    result.push({ cases, grossBudget: cases * CASE_COST, full, theoretical, rare, epic });
  }
  console.log('GARAGE_BUDGET_JSON=' + JSON.stringify(result));
});

test('selection policies and case buying produce deterministic race and garage outcomes', () => {
  const policies = ['starter', 'best-owned', 'rare-first', 'epic-first'];
  const results = [];
  for (const policy of policies) {
    const runs = [];
    for (let i = 0; i < 32; i++) {
      let state = initialState();
      const roll = rng((0xC0DE + Math.imul(i + 1, 3571)) >>> 0);
      for (let action = 0; action < 2500; action++) {
        if (state.credits >= CASE_COST + 500 && action % 3 === 0) {
          state = openCase(state, roll());
        } else {
          const owned = state.cars.filter(car => car.owned);
          const ordered = [...owned].sort((a, b) => b.power + b.handling * 0.4 - a.power - a.handling * 0.4);
          const chosen = policy === 'starter' ? owned.find(car => car.id === 'comet')
            : policy === 'rare-first' ? owned.find(car => car.id === 'vortex') ?? ordered[0]
            : policy === 'epic-first' ? owned.find(car => car.id === 'phantom') ?? ordered[0] : ordered[0];
          state = race({ ...state, selectedCarId: chosen.id }, roll()).state;
        }
      }
      runs.push({ credits: state.credits, wins: state.racesWon, garage: state.cars.filter(car => car.owned).length });
    }
    results.push({ policy, meanWins: runs.reduce((a, b) => a + b.wins, 0) / runs.length, meanCredits: runs.reduce((a, b) => a + b.credits, 0) / runs.length, completion: fraction(runs, row => row.garage === 3) });
  }
  const by = Object.fromEntries(results.map(row => [row.policy, row]));
  assert.ok(by['best-owned'].meanWins >= by.starter.meanWins);
  assert.ok(by['epic-first'].meanWins >= by.starter.meanWins);
  assert.deepEqual(results, results.map(row => ({ ...row })));
  console.log('CAR_SELECTION_JSON=' + JSON.stringify(results));
});

test('isolated upgrade-price and car-power scenarios quantify payback without changing game constants', () => {
  const trials = 10000;
  const prices = [150, UPGRADE_COST, 450, 600];
  const powers = [95, 105, 115, 125, 135, 160, 230];
  const winRates = [];
  for (const power of powers) {
    let wins = 0;
    const roll = rng(0xB00B + power);
    const car = initialState().cars[0];
    for (let i = 0; i < trials; i++) if (power + car.handling * 0.4 + roll() * 60 >= 155) wins++;
    const expected = Math.max(0, Math.min(1, (power + car.handling * 0.4 + 60 - 155) / 60));
    approx(wins / trials, expected, trials, 0.01);
    winRates.push({ power, winRate: wins / trials, theoretical: expected, expectedCreditsPerRace: 50 + 130 * expected });
  }
  const baseline = winRates.find(row => row.power === 105);
  const boosted = winRates.find(row => row.power === 115);
  const uplift = boosted.expectedCreditsPerRace - baseline.expectedCreditsPerRace;
  const payback = prices.map(price => ({ hypotheticalPrice: price, additionalCreditsPerRace: uplift, breakEvenRaces: Math.ceil(price / uplift) }));
  assert.ok(payback.every(row => row.breakEvenRaces > 0));
  assert.equal(CASE_COST, 250);
  assert.equal(UPGRADE_COST, 300);
  let real = { ...initialState(), credits: 1000 };
  real = upgrade(real);
  assert.equal(real.credits, 700);
  assert.equal(real.cars[0].power, 115);
  console.log('UPGRADE_SENSITIVITY_JSON=' + JSON.stringify({ winRates, payback }));
});
