import './style.css';
import { initialState, openCase, upgrade, race, safeLoad, type GameState, type Language } from './game';
type Tab = 'garage' | 'cases' | 'races';
const copy = {
  ru: { garage: 'Гараж', cases: 'Кейсы', races: 'Гонки', subtitle: 'Твоя автомобильная империя начинается здесь', credits: 'Кредиты', level: 'Уровень', owned: 'В гараже', locked: 'Не получена', open: 'Открыть кейс · 250', upgrade: 'Улучшить двигатель · 300', race: 'Начать заезд', win: 'Победа!', loss: 'Поражение', insufficient: 'Недостаточно кредитов', history: 'Последние события', demo: 'Прототип · локальное сохранение', intro: 'Открывай кейсы, улучшай машины и выигрывай заезды.' },
  uk: { garage: 'Гараж', cases: 'Кейси', races: 'Перегони', subtitle: 'Твоя автомобільна імперія починається тут', credits: 'Кредити', level: 'Рівень', owned: 'У гаражі', locked: 'Не отримано', open: 'Відкрити кейс · 250', upgrade: 'Покращити двигун · 300', race: 'Почати заїзд', win: 'Перемога!', loss: 'Поразка', insufficient: 'Недостатньо кредитів', history: 'Останні події', demo: 'Прототип · локальне збереження', intro: 'Відкривай кейси, покращуй машини та вигравай заїзди.' }
};
const key = 'case-rush-save-v1';
let state: GameState;
try { state = safeLoad(localStorage.getItem(key)); } catch { state = initialState(); }
let tab: Tab = 'garage';
let notice = '';
const root = document.querySelector<HTMLDivElement>('#app')!;
function save(): void { try { localStorage.setItem(key, JSON.stringify(state)); } catch { notice = 'Storage unavailable'; } }
function render(): void {
  const t = copy[state.language];
  const selected = state.cars.find(car => car.id === state.selectedCarId)!;
  root.innerHTML = `<main class="shell"><header class="header"><div class="brand"><span class="logo">CR</span><div><h1>CASE RUSH</h1><small>AUTO EMPIRE</small></div></div><button id="lang" class="lang" aria-label="Change language">${state.language.toUpperCase()} ▾</button></header>
  <section class="hero"><div class="eyebrow">AUTO EMPIRE · SEASON 01</div><h2>${t.subtitle}</h2><p>${t.intro}</p><div class="metrics"><div><small>${t.credits}</small><strong>◈ ${state.credits.toLocaleString()}</strong></div><div><small>${t.level}</small><strong>${state.level}</strong></div></div></section>
  <nav class="tabs" aria-label="Game navigation">${(['garage','cases','races'] as Tab[]).map(x => `<button data-tab="${x}" class="${tab===x?'active':''}">${t[x]}</button>`).join('')}</nav>
  <section class="panel">${tab === 'garage' ? `<div class="section-title"><h3>${t.garage}</h3><span>${state.cars.filter(c=>c.owned).length}/${state.cars.length}</span></div><div class="car-art"><div class="glow"></div><div class="car-icon">🏎️</div><div class="model">${selected.name}</div><span class="tier">${selected.tier.toUpperCase()}</span></div><div class="stats"><span>POWER <b>${selected.power}</b></span><span>HANDLING <b>${selected.handling}</b></span></div><button id="upgrade" class="primary">${t.upgrade}</button><div class="collection">${state.cars.map(car=>`<button data-car="${car.id}" ${!car.owned?'disabled':''} class="car-card ${car.id===selected.id?'selected':''}"><span>🏎️</span><b>${car.name}</b><small>${car.owned?t.owned:t.locked}</small></button>`).join('')}</div>` : tab === 'cases' ? `<div class="section-title"><h3>${t.cases}</h3><span>STREET CASE</span></div><div class="case-art">◈<div class="case-label">STREET<br/>CASE</div></div><p class="hint">COMMON 70% · RARE 25% · EPIC 5%</p><button id="open" class="primary">${t.open}</button>` : `<div class="section-title"><h3>${t.races}</h3><span>STREET SPRINT</span></div><div class="track"><div class="road-line"></div><span class="race-car">🏎️</span><span class="finish">FINISH</span></div><p class="hint">${selected.name} · POWER ${selected.power}</p><button id="race" class="primary">${t.race}</button>`}</section>
  ${notice?`<div class="notice" role="status">${notice}</div>`:''}<section class="events"><h3>${t.history}</h3><p>${state.history.slice(0,4).join(' · ') || '—'}</p></section><footer>${t.demo}</footer></main>`;
  root.querySelector('#lang')?.addEventListener('click',()=>{state.language=(state.language==='ru'?'uk':'ru') as Language;notice='';save();render();});
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{tab=btn.dataset.tab as Tab;notice='';render();}));
  root.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(btn=>btn.addEventListener('click',()=>{state.selectedCarId=btn.dataset.car!;save();render();}));
  root.querySelector('#open')?.addEventListener('click',()=>perform(()=>{state=openCase(state,Math.random());notice=state.history[0];}));
  root.querySelector('#upgrade')?.addEventListener('click',()=>perform(()=>{state=upgrade(state);notice='+10 POWER';}));
  root.querySelector('#race')?.addEventListener('click',()=>perform(()=>{const result=race(state,Math.random());state=result.state;notice=result.won?t.win:t.loss;}));
}
function perform(action:()=>void):void { try { action();save(); } catch(e){ notice=e instanceof Error && e.message==='INSUFFICIENT_CREDITS'?copy[state.language].insufficient:'Error'; } render(); }
render();
