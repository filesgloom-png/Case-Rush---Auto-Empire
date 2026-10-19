import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const game = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { initialState, careerRace, careerStages, safeLoad, openCase, installPart, upgrade } = game;

test('career stages escalate with distinct track themes and capped rewards', () => {
  assert.equal(careerStages.length, 8);
  for (let i = 1; i < careerStages.length; i++) {
    assert.ok(careerStages[i].opponentPower > careerStages[i - 1].opponentPower);
    assert.ok(careerStages[i].requiredPower > careerStages[i - 1].requiredPower);
    assert.ok(careerStages[i].reward > careerStages[i - 1].reward);
  }
  assert.ok(careerStages.reduce((sum, stage) => sum + stage.reward, 0) <= 1_100);
  assert.deepEqual([...new Set(careerStages.map(stage => stage.track))].sort(), ['desert','industrial','night','skyline']);
});

test('stage progression requires power, handling and the matching installed slots', () => {
  let state = initialState();
  const first = careerRace(state, 0.999);
  assert.equal(first.eligible, true);
  assert.equal(first.won, true);
  assert.equal(first.reward, 60);
  assert.equal(first.state.careerStage, 2);
  const blocked = careerRace(first.state, 0.999);
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.won, false);
  assert.equal(blocked.state.careerStage, 2);
  state = openCase(first.state, 0.1, 0.1, 0.1, 0.1);
  state = installPart(state, 'engine', 'engine-common');
  state = upgrade({ ...state, credits: 3_000 });
  const ready = careerRace(state, 0.999);
  assert.equal(ready.eligible, true);
  assert.equal(ready.won, true);
  assert.equal(ready.state.careerStage, 3);
});

test('career reward cannot be claimed repeatedly by replaying a completed stage', () => {
  let state = initialState();
  state = careerRace(state, 0.999).state;
  assert.equal(state.careerStage, 2);
  assert.throws(() => careerRace({ ...state, careerStage: 9 }, 0.5), /CAREER_COMPLETE/);
  assert.equal(careerStages.reduce((sum, stage) => sum + stage.reward, 0), 1_060);
});

test('streak bonuses are one-time and failed attempts reset the streak', () => {
  const third = careerRace({ ...initialState(), careerStreak: 2 }, 0.999);
  assert.equal(third.won, true);
  assert.equal(third.bonus, 120);
  assert.deepEqual(third.state.careerBonusClaimed, [3]);
  const failed = careerRace({ ...third.state, careerStage: 2, careerStreak: 3 }, 0);
  assert.equal(failed.state.careerStreak, 0);
  assert.equal(failed.reward, 0, 'failed career attempts do not pay credits and cannot be farmed');
  assert.deepEqual(failed.state.careerBonusClaimed, [3]);
});

test('career save fields migrate and invalid values are clamped safely', () => {
  const loaded = safeLoad(JSON.stringify({ ...initialState(), careerStage: 5, careerWins: 4, careerStreak: 2, careerBonusClaimed: [3, 3, 7, '6'] }));
  assert.equal(loaded.careerStage, 5);
  assert.equal(loaded.careerWins, 4);
  assert.equal(loaded.careerStreak, 2);
  assert.deepEqual(loaded.careerBonusClaimed, [3]);
  const legacy = { ...initialState() };
  delete legacy.careerStage; delete legacy.careerWins; delete legacy.careerStreak; delete legacy.careerBonusClaimed;
  const migrated = safeLoad(JSON.stringify(legacy));
  assert.equal(migrated.careerStage, 1);
  assert.equal(migrated.careerWins, 0);
  assert.equal(migrated.careerStreak, 0);
  assert.deepEqual(migrated.careerBonusClaimed, []);
  assert.equal(safeLoad(JSON.stringify({ ...initialState(), careerStage: 99 })).careerStage, 1);
});


test('complete career simulation has a fixed total payout and cannot replay completed stages', () => {
  let state = initialState();
  state = {
    ...state,
    cars: state.cars.map(car => car.id === 'comet' ? { ...car, power: 230, handling: 100 } : car),
    installedParts: { ...state.installedParts, comet: { engine: 'engine-epic', turbo: 'turbo-epic', tires: 'tires-epic', ecu: 'ecu-epic' } }
  };
  const startingCredits = state.credits;
  for (let i = 0; i < 8; i++) {
    const result = careerRace(state, 0.999);
    assert.equal(result.won, true, 'fully prepared car clears every stage');
    state = result.state;
  }
  assert.equal(state.careerStage, 9);
  assert.equal(state.careerWins, 8);
  assert.deepEqual(state.careerBonusClaimed, [3, 6]);
  assert.equal(state.credits - startingCredits, 1_380, 'stage payouts total 1,060 and one-time streak bonuses total 320');
  assert.throws(() => careerRace(state, 0.999), /CAREER_COMPLETE/);
  for (let i = 0; i < 50; i++) {
    const failed = careerRace({ ...initialState(), careerStage: 2 }, 0.999);
    assert.equal(failed.won, false);
    assert.equal(failed.reward, 0);
    assert.equal(failed.state.credits, initialState().credits);
  }
});

test('career UI offers sprint and career, varied tracks and reduced-motion support', () => {
  const app = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(app, /data-race-mode="career"/);
  assert.match(app, /data-race-mode="sprint"/);
  assert.match(app, /careerRace\(state, Math\.random\(\)\)/);
  assert.match(app, /track-theme-\$\{careerStage\?\.track/);
  assert.match(styles, /\.track-theme-industrial/);
  assert.match(styles, /\.track-theme-desert/);
  assert.match(styles, /\.track-theme-skyline/);
  assert.match(styles, /\.career-card\.racing \.player-car/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
