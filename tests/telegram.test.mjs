import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const telegram = readFileSync(new URL('../src/telegram.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('Telegram bootstrap calls ready and expand and sets app colors', () => {
  assert.match(telegram, /webApp\.ready\?\.\(\)/);
  assert.match(telegram, /webApp\.expand\?\.\(\)/);
  assert.match(telegram, /setHeaderColor/);
  assert.match(telegram, /setBackgroundColor/);
});
test('Telegram identity is not trusted through initDataUnsafe', () => {
  assert.doesNotMatch(telegram, /webApp\\.initDataUnsafe|Telegram\\.WebApp\\.initDataUnsafe/);
  assert.match(telegram, /initDataPresent/);
  assert.match(telegram, /getTelegramInitDataForBackend/);
});
test('Telegram viewport and safe areas are responsive', () => {
  assert.match(telegram, /viewportChanged/);
  assert.match(telegram, /safeAreaChanged/);
  assert.match(css, /--case-rush-viewport-height/);
  assert.match(css, /env\(safe-area-inset-bottom/);
});
test('launch documentation requires HTTPS and server-side validation', () => {
  assert.match(readme, /over HTTPS/i);
  assert.match(readme, /server only/i);
  assert.match(readme, /No live HTTPS deployment/i);
  assert.match(app, /initTelegramWebApp/);
});
