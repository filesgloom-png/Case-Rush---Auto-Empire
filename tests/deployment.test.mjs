import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('all car and case images use the Vite base path for subpath hosting', () => {
  assert.match(app, /import\.meta\.env\.BASE_URL/);
  assert.doesNotMatch(app, /src="\/cars\//);
  assert.match(app, /street-case\.svg/);
  assert.match(app, /vortex\.svg/);
});
test('Pages workflow builds the repository subpath and deploys only static dist output', () => {
  assert.match(workflow, /npm run build -- --base=\/Case-Rush---Auto-Empire\//);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /branches: \[main\]/);
});
test('deployment documentation distinguishes target URL from verified publication', () => {
  assert.match(readme, /Expected GitHub Pages URL/);
  assert.match(readme, /not a claim that the site is already live/);
  assert.match(readme, /Settings → Pages/);
});
