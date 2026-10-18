import './style.css';
import { initTelegramWebApp } from './telegram';
import { initialState, openCase, upgrade, race, safeLoad, type GameState, type Language } from './game';
type Tab = 'garage' | 'cases' | 'races';
const copy = {
  ru: {
    garage: 'Гараж', cases: 'Кейсы', races: 'Гонки', subtitle: 'Твоя коллекция. Твои правила.',
    credits: 'КРЕДИТЫ', level: 'УРОВЕНЬ', collection: 'Моя коллекция', owned: 'В гараже', locked: 'Не получена',
    power: 'МОЩНОСТЬ', handling: 'УПРАВЛЯЕМОСТЬ', upgrade: 'Улучшить двигатель', cost: 'Стоимость', open: 'Открыть кейс',
    streetCase: 'УЛИЧНЫЙ КЕЙС', odds: 'Шансы выпадения', common: 'Обычная', rare: 'Редкая', epic: 'Эпическая',
    raceTitle: 'УЛИЧНЫЙ СПРИНТ', raceDesc: 'Заезд проходит автоматически. Подготовь машину и проверь свой рейтинг.',
    startRace: 'Начать заезд', win: 'ПОБЕДА!', loss: 'В СЛЕДУЮЩИЙ РАЗ!', result: 'Результат заезда',
    history: 'Последние события', empty: 'Пока тихо. Первый заезд уже ждёт.', insufficient: 'Недостаточно кредитов',
    caseReceived: 'Новый автомобиль в коллекции!', duplicate: 'Повторная машина: начислена компенсация.',
    upgraded: 'Двигатель улучшен: +10 мощности', demo: 'ПРОТОТИП · СОХРАНЕНИЕ НА ЭТОМ УСТРОЙСТВЕ',
    intro: 'Открывай кейсы, собирай машины и выходи на старт.', raceReward: 'Награда за заезд начислена'
  },
  uk: {
    garage: 'Гараж', cases: 'Кейси', races: 'Перегони', subtitle: 'Твоя колекція. Твої правила.',
    credits: 'КРЕДИТИ', level: 'РІВЕНЬ', collection: 'Моя колекція', owned: 'У гаражі', locked: 'Не отримано',
    power: 'ПОТУЖНІСТЬ', handling: 'КЕРОВАНІСТЬ', upgrade: 'Покращити двигун', cost: 'Вартість', open: 'Відкрити кейс',
    streetCase: 'ВУЛИЧНИЙ КЕЙС', odds: 'Шанси випадіння', common: 'Звичайна', rare: 'Рідкісна', epic: 'Епічна',
    raceTitle: 'ВУЛИЧНИЙ СПРИНТ', raceDesc: 'Перегони проходять автоматично. Підготуй авто та перевір свій рейтинг.',
    startRace: 'Почати заїзд', win: 'ПЕРЕМОГА!', loss: 'НАСТУПНОГО РАЗУ!', result: 'Результат заїзду',
    history: 'Останні події', empty: 'Поки тихо. Перший заїзд уже чекає.', insufficient: 'Недостатньо кредитів',
    caseReceived: 'Нове авто в колекції!', duplicate: 'Повторне авто: нараховано компенсацію.',
    upgraded: 'Двигун покращено: +10 потужності', demo: 'ПРОТОТИП · ЗБЕРЕЖЕННЯ НА ЦЬОМУ ПРИСТРОЇ',
    intro: 'Відкривай кейси, збирай авто та виходь на старт.', raceReward: 'Нагороду за заїзд нараховано'
  }
};
const key = 'case-rush-save-v1';
let state: GameState;
try { state = safeLoad(localStorage.getItem(key)); } catch { state = initialState(); }
let tab: Tab = 'garage';
let notice = '';
let noticeKind: 'good' | 'bad' = 'good';
const root = document.querySelector<HTMLDivElement>('#app')!;
initTelegramWebApp();
function save(): void { try { localStorage.setItem(key, JSON.stringify(state)); } catch { notice = 'Storage unavailable'; noticeKind = 'bad'; } }
function carImage(id: string, extra = ''): string { return `<img class="car-image ${extra}" src="${import.meta.env.BASE_URL}cars/${id}.svg" alt="" draggable="false" />`; }
function render(): void {
  const t = copy[state.language];
  const selected = state.cars.find(car => car.id === state.selectedCarId && car.owned) ?? state.cars.find(car => car.owned)!;
  const tabs: Tab[] = ['garage', 'cases', 'races'];
  root.innerHTML = `<main class="app-shell">
    <header class="topbar"><div class="brand"><span class="brand-mark">CR<span>↗</span></span><div><strong>CASE RUSH</strong><small>AUTO EMPIRE</small></div></div>
      <button id="lang" class="lang-switch" aria-label="Change language">${state.language.toUpperCase()} <span>⌄</span></button>
    </header>
    <section class="welcome"><div><div class="eyebrow"><i></i> YOUR GARAGE · SEASON 01</div><h1>${t.subtitle}</h1><p>${t.intro}</p></div><div class="wallet"><small>${t.credits}</small><strong><span>◈</span> ${state.credits.toLocaleString()}</strong><small class="level-label">${t.level} <b>${state.level}</b></small></div></section>
    <nav class="tabbar" aria-label="Game sections">${tabs.map(x => `<button data-tab="${x}" class="${tab === x ? 'active' : ''}"><span class="tab-icon">${x === 'garage' ? '▰' : x === 'cases' ? '▦' : '↗'}</span>${t[x]}</button>`).join('')}</nav>
    <section class="screen">
    ${tab === 'garage' ? `
      <div class="section-head"><div><span class="eyebrow">01 / COLLECTION</span><h2>${t.collection}</h2></div><span class="count-pill">${state.cars.filter(car => car.owned).length.toString().padStart(2,'0')} <small>/ ${state.cars.length.toString().padStart(2,'0')}</small></span></div>
      <article class="featured-car"><div class="car-backdrop"></div><div class="car-tag">${selected.tier.toUpperCase()} CLASS <span>•</span> #${selected.id.toUpperCase()}</div>${carImage(selected.id, 'featured-image')}<div class="car-info"><div><h3>${selected.name}</h3><p>STREET SERIES <span>·</span> MODEL 2026</p></div><span class="tier-dot ${selected.tier}"></span></div>
        <div class="stat-grid"><div class="stat"><div><span>${t.power}</span><b>${selected.power}</b></div><div class="meter"><i style="width:${Math.min(100, selected.power / 3)}%"></i></div></div><div class="stat"><div><span>${t.handling}</span><b>${selected.handling}</b></div><div class="meter"><i style="width:${selected.handling}%"></i></div></div></div>
        <button id="upgrade" class="primary-button"><span>＋</span><span>${t.upgrade}<small>${t.cost}: 300 ◈</small></span><b>↗</b></button>
      </article>
      <div class="section-head collection-head"><div><span class="eyebrow">YOUR LINEUP</span><h2>${t.collection}</h2></div></div>
      <div class="car-grid">${state.cars.map(car => `<button data-car="${car.id}" ${!car.owned ? 'disabled' : ''} class="car-tile ${car.id === selected.id ? 'selected' : ''}">${carImage(car.id,'tile-image')}<span class="tile-tier ${car.tier}">${car.tier.toUpperCase()}</span><b>${car.name}</b><small>${car.owned ? t.owned : t.locked}</small></button>`).join('')}</div>`
      : tab === 'cases' ? `
      <div class="section-head"><div><span class="eyebrow">02 / DROP ZONE</span><h2>${t.cases}</h2></div><span class="count-pill">CASE <small>01</small></span></div>
      <article class="case-panel"><div class="case-glow"></div><div class="case-label">${t.streetCase}</div><img class="case-image" src="${import.meta.env.BASE_URL}cars/street-case.svg" alt="Street case"/><div class="case-name">STREET <b>CASE</b></div><p>Three tiers. One new ride.</p><button id="open" class="primary-button"><span>✦</span><span>${t.open}<small>250 ◈</small></span><b>↗</b></button></article>
      <div class="odds-card"><h3>${t.odds}</h3><div><span><i class="rarity common"></i>${t.common}</span><b>70%</b></div><div><span><i class="rarity rare"></i>${t.rare}</span><b>25%</b></div><div><span><i class="rarity epic"></i>${t.epic}</span><b>5%</b></div><small>Odds are shown before opening. Duplicate cars grant a credit compensation.</small></div>`
      : `
      <div class="section-head"><div><span class="eyebrow">03 / RACE CONTROL</span><h2>${t.races}</h2></div><span class="count-pill">SPRINT <small>01</small></span></div>
      <article class="race-panel"><div class="race-top"><span class="eyebrow">NIGHT CIRCUIT</span><span class="live-dot">● READY</span></div><h3>${t.raceTitle}</h3><p>${t.raceDesc}</p><div class="race-track"><div class="track-glow"></div><div class="track-stripe"></div>${carImage(selected.id,'race-car player-car')}<img class="race-car rival-car" src="${import.meta.env.BASE_URL}cars/vortex.svg" alt="Rival car"/><span class="finish-line">FINISH</span></div><div class="race-stats"><span>YOUR CAR <b>${selected.name}</b></span><span>${t.power} <b>${selected.power}</b></span></div><button id="race" class="primary-button"><span>▶</span><span>${t.startRace}<small>REWARD UP TO 180 ◈ + XP</small></span><b>↗</b></button></article>`
    }</section>
    ${notice ? `<div class="notice ${noticeKind}" role="status">${notice}</div>` : ''}
    <section class="history"><div class="history-head"><h3>${t.history}</h3><span>RECENT</span></div>${state.history.length ? state.history.slice(0,3).map((event,i) => `<div class="history-item"><span class="history-index">0${i+1}</span><span>${event}</span><i>↗</i></div>`).join('') : `<p class="empty-history">${t.empty}</p>`}</section>
    <footer><span class="footer-mark">CR</span><span>${t.demo}</span></footer>
  </main>`;
  root.querySelector('#lang')?.addEventListener('click', () => { state.language = (state.language === 'ru' ? 'uk' : 'ru') as Language; notice = ''; save(); render(); });
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.tab as Tab; notice = ''; render(); }));
  root.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(button => button.addEventListener('click', () => { state.selectedCarId = button.dataset.car!; notice = ''; save(); render(); }));
  root.querySelector('#open')?.addEventListener('click', () => perform(() => {
    const previous = state.cars.map(car => car.owned);
    state = openCase(state, Math.random());
    const prize = state.cars.find((car,i) => car.owned && !previous[i]);
    notice = prize ? `${t.caseReceived} ${prize.name}` : t.duplicate;
  }));
  root.querySelector('#upgrade')?.addEventListener('click', () => perform(() => { state = upgrade(state); notice = t.upgraded; }));
  root.querySelector('#race')?.addEventListener('click', () => perform(() => {
    const result = race(state, Math.random());
    state = result.state;
    notice = result.won ? t.win : t.loss;
    noticeKind = result.won ? 'good' : 'bad';
  }));
}
function perform(action: () => void): void {
  try { action(); save(); }
  catch (error) {
    notice = error instanceof Error && error.message === 'INSUFFICIENT_CREDITS' ? copy[state.language].insufficient : 'Action unavailable';
    noticeKind = 'bad';
  }
  render();
}
render();
