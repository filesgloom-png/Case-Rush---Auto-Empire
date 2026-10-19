import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const game = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { initialState, openCase, getPartDrop, installPart, getCarStats, safeLoad, race, partCatalog } = game;

test('case part drops use fixed rarity bands and all four slots', () => {
  assert.equal(getPartDrop(0.69, 0.01).tier, 'common');
  assert.equal(getPartDrop(0.7, 0.26).tier, 'rare');
  assert.equal(getPartDrop(0.95, 0.76).tier, 'epic');
  assert.equal(getPartDrop(0.2, 0.01).slot, 'engine');
  assert.equal(getPartDrop(0.2, 0.26).slot, 'turbo');
  assert.equal(getPartDrop(0.2, 0.51).slot, 'tires');
  assert.equal(getPartDrop(0.2, 0.76).slot, 'ecu');
  assert.throws(() => getPartDrop(1, 0), /INVALID_PART_ROLL/);
});

test('case preserves car odds and grants a part only when the separate part roll hits', () => {
  const start = initialState();
  const withPart = openCase(start, 0.7, 0.1, 0.96, 0.76);
  assert.equal(withPart.cars.find(car => car.id === 'vortex').owned, true);
  assert.equal(withPart.parts['ecu-epic'], 1);
  assert.equal(withPart.credits, start.credits - 250);
  const withoutPart = openCase(start, 0.95, 0.9, 0.96, 0.76);
  assert.equal(withoutPart.cars.find(car => car.id === 'phantom').owned, true);
  assert.equal(Object.values(withoutPart.parts).reduce((sum, count) => sum + count, 0), 0);
});

test('parts install into matching slots, alter race stats, and return replaced parts to inventory', () => {
  let state = initialState();
  state = openCase(state, 0.2, 0.1, 0.1, 0.1);
  assert.equal(state.parts['engine-common'], 1);
  state = installPart(state, 'engine', 'engine-common');
  assert.equal(state.parts['engine-common'], 0);
  assert.equal(state.installedParts.comet.engine, 'engine-common');
  assert.equal(getCarStats(state, 'comet').power, 111);
  state = openCase(state, 0.2, 0.1, 0.75, 0.1);
  assert.equal(state.parts['engine-rare'], 1);
  state = installPart(state, 'engine', 'engine-rare');
  assert.equal(state.parts['engine-common'], 1);
  assert.equal(state.parts['engine-rare'], 0);
  assert.equal(getCarStats(state, 'comet').power, 119);
  assert.equal(race(state, 0.2).won, true);
});

test('cannot install unowned or mismatched parts and inventory never goes negative', () => {
  const state = initialState();
  assert.throws(() => installPart(state, 'turbo', 'engine-common'), /INVALID_PART/);
  assert.throws(() => installPart(state, 'engine', 'engine-common'), /PART_NOT_OWNED/);
  assert.ok(partCatalog.every(part => (state.parts[part.id] ?? 0) >= 0));
});

test('legacy saves migrate with empty parts and installed slots; valid part progress persists', () => {
  const legacy = initialState();
  delete legacy.parts; delete legacy.installedParts;
  const migrated = safeLoad(JSON.stringify(legacy));
  assert.equal(Object.values(migrated.parts).reduce((sum, count) => sum + count, 0), 0);
  assert.deepEqual(migrated.installedParts.comet, {});
  let state = openCase(initialState(), 0.2, 0.1, 0.1, 0.1);
  state = installPart(state, 'engine', 'engine-common');
  const loaded = safeLoad(JSON.stringify(state));
  assert.equal(loaded.installedParts.comet.engine, 'engine-common');
  assert.equal(getCarStats(loaded, 'comet').power, 111);
  const corrupted = safeLoad(JSON.stringify({ ...state, parts: { 'engine-common': -99, 'turbo-epic': 'many' }, installedParts: { comet: { engine: 'turbo-epic', turbo: 'not-a-part' } } }));
  assert.equal(corrupted.parts['engine-common'], 0);
  assert.equal(corrupted.installedParts.comet.engine, undefined);
  assert.equal(corrupted.installedParts.comet.turbo, undefined);
});


test('case-opening animation is wired to the real open action and honors reduced motion', () => {
  const app = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(app, /classList\.add\('opening'\)/);
  assert.match(app, /window\.setTimeout\(\(\) => perform/);
  assert.match(css, /@keyframes case-rush-shake/);
  assert.match(app, /case-sparks/);
  assert.match(app, /case-stage-mark/);
  assert.match(css, /@keyframes case-ring-spin/);
  assert.match(css, /@keyframes car-showcase/);
  assert.match(css, /@keyframes reward-card-in/);
  assert.match(app, /reward-reveal-backdrop/);
  assert.match(app, /installedModBadges/);
  assert.match(app, /mod-\$\{slot\}/);
  for (const model of ['comet.svg', 'vortex.svg', 'phantom.svg']) {
    const svg = readFileSync(new URL('../public/cars/' + model, import.meta.url), 'utf8');
    assert.match(svg, /<svg/);
    assert.match(svg, /linearGradient/);
    assert.match(svg, /stroke-width/);
  }
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(app, /Установи 4 детали/);
  assert.match(app, /Встанови 4 деталі/);
});

test('appearance presets persist, legacy saves migrate, and corrupt appearance values are rejected', () => {
  const fresh = initialState();
  assert.deepEqual(fresh.appearance.comet, { body: 'factory', neon: 'mint', bodyKit: 'street' });
  const customized = { ...fresh, appearance: { ...fresh.appearance, comet: { body: 'crimson', neon: 'pink', bodyKit: 'wide' } } };
  assert.deepEqual(safeLoad(JSON.stringify(customized)).appearance.comet, { body: 'crimson', neon: 'pink', bodyKit: 'wide' });
  const legacy = { ...fresh }; delete legacy.appearance;
  assert.deepEqual(safeLoad(JSON.stringify(legacy)).appearance.comet, { body: 'factory', neon: 'mint', bodyKit: 'street' });
  const corrupt = safeLoad(JSON.stringify({ ...customized, appearance: { comet: { body: 'bad', neon: 'nope', bodyKit: 'airplane' } } }));
  assert.deepEqual(corrupt.appearance.comet, { body: 'factory', neon: 'mint', bodyKit: 'street' });
});

test('garage customization controls save state and rewards style all three rarity tiers', () => {
  const app = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(app, /data-appearance/);
  assert.match(app, /state\.appearance =/);
  assert.match(app, /localStorage\.setItem\(key, JSON\.stringify\(state\)\)/);
  assert.match(app, /rarity-\$\{rewardReveal\.tier\}/);
  assert.match(css, /rarity-common/);
  assert.match(css, /rarity-rare/);
  assert.match(css, /rarity-epic/);
  assert.match(css, /kit-wide/);
  assert.match(css, /neon-pink/);
});

test('inline SVG car models have isolated paint layers and real visual tuning layers', () => {
  const app = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  for (const model of ['comet', 'vortex', 'phantom']) {
    const svg = readFileSync(new URL('../src/cars/' + model + '.svg', import.meta.url), 'utf8');
    assert.match(svg, /class="body-shell" fill="url\(#paint\)"/);
    assert.match(svg, /class="turbo-detail"/);
    assert.match(svg, /class="wheel-race-spokes"/);
    assert.match(svg, /class="engine-detail"/);
    assert.match(svg, /class="ecu-detail"/);
    assert.match(svg, /class="wide-kit-detail"/);
    assert.match(svg, /class="track-kit-detail"/);
    assert.match(svg, /class="neon-glow"/);
    assert.match(svg, /var\(--paint-/);
  }
  assert.match(app, /import cometSvg from '\.\/cars\/comet\.svg\?raw'/);
  assert.match(app, /carSvgInstance/);
  assert.match(app, /new Map<string, string>\(\)/);
  assert.match(css, /\.car-image\.body-crimson\{--paint-light:/);
  assert.match(css, /\.car-image\.mod-turbo \.turbo-detail/);
  assert.match(css, /\.car-image\.mod-tires \.wheel-race-spokes/);
  assert.match(css, /\.car-image\.kit-wide \.wide-kit-detail/);
  assert.match(css, /\.car-image\.kit-track \.track-kit-detail/);
  assert.doesNotMatch(css, /\.car-image\.body-crimson\{filter:hue-rotate/);
});

test('body paint customization preserves separate glass, wheel, lamp and accent layers', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  for (const color of ['crimson', 'blue', 'violet', 'gold']) assert.match(css, new RegExp('\\.car-image\\.body-' + color + '\\{--paint-light:'));
  for (const model of ['comet', 'vortex', 'phantom']) {
    const svg = readFileSync(new URL('../src/cars/' + model + '.svg', import.meta.url), 'utf8');
    assert.match(svg, /id="glass"/);
    assert.match(svg, /class="wheel-rim"/);
    assert.match(svg, /stroke="#FF/);
    assert.match(svg, /class="body-shell"/);
  }
});

test('all car models expose brake hardware and distinct widebody and track kit silhouettes', () => {
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 for(const model of ['comet','vortex','phantom']){
  const svg=readFileSync(new URL('../src/cars/'+model+'.svg',import.meta.url),'utf8');
  assert.equal((svg.match(/class="brake-upgrade"/g)||[]).length,2);
  assert.equal((svg.match(/class="wheel-race-spokes"/g)||[]).length,2);
  assert.match(svg,/class="wide-kit-detail"[\s\S]*?stroke-width="7"/);
  assert.match(svg,/class="track-kit-detail"[\s\S]*?stroke-width="3"/);
  assert.match(css,/\.car-image\.mod-tires \.brake-upgrade\{display:inline\}/);
  assert.match(css,/\.car-image\.kit-wide \.wide-kit-detail\{[^}]*display:inline/);
  assert.match(css,/\.car-image\.kit-track \.track-kit-detail\{[^}]*display:inline/);
 }
});
test('SVG template IDs and local URL references stay isolated for simultaneous instances',()=>{
 const app=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.match(app,/carSvgInstance/); assert.match(app,/new Map<string, string>\(\)/);
 for(const model of ['comet','vortex','phantom']){
  const source=readFileSync(new URL('../src/cars/'+model+'.svg',import.meta.url),'utf8');
  const instances=[1,2].map(n=>{
   const map=new Map();
   let svg=source.replace(/id="([^"]+)"/g,(_m,id)=>{const v='cr'+n+'-'+id;map.set(id,v);return 'id="'+v+'"';});
   svg=svg.replace(/url\(#([^)]+)\)/g,(_m,id)=>'url(#'+(map.get(id)||id)+')');
   return svg;
  });
  const ids=instances.flatMap(s=>[...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
  assert.equal(ids.length,new Set(ids).size);
  for(const svg of instances){
   const own=new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
   for(const ref of [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1])) assert.ok(own.has(ref));
  }
 }
});
