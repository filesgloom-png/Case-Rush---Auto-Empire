import './style.css';
import { initTelegramWebApp } from './telegram';
import { initialState, openCase, upgrade, race, safeLoad, getCarStats, installPart, getPartDrop, partCatalog, type GameState, type Language, type PartSlot } from './game';
type Tab = 'garage' | 'cases' | 'races';
const copy = {
  ru: {
    garage: 'Гараж', cases: 'Кейсы', races: 'Гонки', subtitle: 'Твоя коллекция. Твои правила.',
    credits: 'КРЕДИТЫ', level: 'УРОВЕНЬ', collection: 'Моя коллекция', owned: 'В гараже', locked: 'Не получена',
    power: 'МОЩНОСТЬ', handling: 'УПРАВЛЯЕМОСТЬ', upgrade: 'Улучшить двигатель', cost: 'Стоимость', open: 'Открыть кейс', parts: 'Мастерская деталей', partDrop: 'Шанс детали: 50%', engine: 'Двигатель', turbo: 'Турбина', tires: 'Шины', ecu: 'ЭБУ', emptySlot: 'Слот пуст', noParts: 'Нет деталей этого типа — открывай кейсы', powerShort: 'мощн.', handlingShort: 'упр.', installed: 'Деталь установлена',
    streetCase: 'УЛИЧНЫЙ КЕЙС', odds: 'Шансы выпадения', common: 'Обычная', rare: 'Редкая', epic: 'Эпическая',
    raceTitle: 'УЛИЧНЫЙ СПРИНТ', raceDesc: 'Заезд проходит автоматически. Подготовь машину и проверь свой рейтинг.',
    startRace: 'Начать заезд', win: 'ПОБЕДА!', loss: 'В СЛЕДУЮЩИЙ РАЗ!', result: 'Результат заезда',
    history: 'Последние события', empty: 'Пока тихо. Первый заезд уже ждёт.', insufficient: 'Недостаточно кредитов',
    caseReceived: 'Новый автомобиль в коллекции!', duplicate: 'Повторная машина: начислена компенсация.',
    upgraded: 'Двигатель улучшен: +10 мощности', demo: 'ПРОТОТИП · СОХРАНЕНИЕ НА ЭТОМ УСТРОЙСТВЕ',
    intro: 'Открывай кейсы, собирай машины и выходи на старт.', raceReward: 'Награда за заезд начислена', achievements: 'Достижения', achFirstCase: 'Первый дроп', achFirstCaseDesc: 'Открой первый кейс', achRaceWins: 'Гонщик', achRaceWinsDesc: 'Выиграй 5 заездов', achCollector: 'Коллекционер', achCollectorDesc: 'Собери все 3 машины', achTuner: 'Тюнер', achTunerDesc: 'Улучши двигатель 5 раз', completed: 'ВЫПОЛНЕНО', inProgress: 'В ПРОЦЕССЕ'
  },
  uk: {
    garage: 'Гараж', cases: 'Кейси', races: 'Перегони', subtitle: 'Твоя колекція. Твої правила.',
    credits: 'КРЕДИТИ', level: 'РІВЕНЬ', collection: 'Моя колекція', owned: 'У гаражі', locked: 'Не отримано',
    power: 'ПОТУЖНІСТЬ', handling: 'КЕРОВАНІСТЬ', upgrade: 'Покращити двигун', cost: 'Вартість', open: 'Відкрити кейс', parts: 'Майстерня деталей', partDrop: 'Шанс деталі: 50%', engine: 'Двигун', turbo: 'Турбіна', tires: 'Шини', ecu: 'ЕБУ', emptySlot: 'Слот порожній', noParts: 'Немає деталей цього типу — відкривай кейси', powerShort: 'потужн.', handlingShort: 'кер.', installed: 'Деталь встановлено',
    streetCase: 'ВУЛИЧНИЙ КЕЙС', odds: 'Шанси випадіння', common: 'Звичайна', rare: 'Рідкісна', epic: 'Епічна',
    raceTitle: 'ВУЛИЧНИЙ СПРИНТ', raceDesc: 'Перегони проходять автоматично. Підготуй авто та перевір свій рейтинг.',
    startRace: 'Почати заїзд', win: 'ПЕРЕМОГА!', loss: 'НАСТУПНОГО РАЗУ!', result: 'Результат заїзду',
    history: 'Останні події', empty: 'Поки тихо. Перший заїзд уже чекає.', insufficient: 'Недостатньо кредитів',
    caseReceived: 'Нове авто в колекції!', duplicate: 'Повторне авто: нараховано компенсацію.',
    upgraded: 'Двигун покращено: +10 потужності', demo: 'ПРОТОТИП · ЗБЕРЕЖЕННЯ НА ЦЬОМУ ПРИСТРОЇ',
    intro: 'Відкривай кейси, збирай авто та виходь на старт.', raceReward: 'Нагороду за заїзд нараховано', achievements: 'Досягнення', achFirstCase: 'Перший дроп', achFirstCaseDesc: 'Відкрий перший кейс', achRaceWins: 'Гонщик', achRaceWinsDesc: 'Виграй 5 заїздів', achCollector: 'Колекціонер', achCollectorDesc: 'Збери всі 3 авто', achTuner: 'Тюнер', achTunerDesc: 'Покращ двигун 5 разів', completed: 'ВИКОНАНО', inProgress: 'У ПРОЦЕСІ'
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
        <div class="stat-grid"><div class="stat"><div><span>${t.power}</span><b>${getCarStats(state, selected.id).power}</b></div><div class="meter"><i style="width:${Math.min(100, getCarStats(state, selected.id).power / 3)}%"></i></div></div><div class="stat"><div><span>${t.handling}</span><b>${getCarStats(state, selected.id).handling}</b></div><div class="meter"><i style="width:${getCarStats(state, selected.id).handling}%"></i></div></div></div>
        <div class="parts-workbench"><div class="parts-head"><h3>${t.parts}</h3><span>${t.partDrop}</span></div>${(['engine','turbo','tires','ecu'] as PartSlot[]).map(slot => { const equippedId = state.installedParts?.[selected.id]?.[slot]; const equipped = partCatalog.find(part => part.id === equippedId); const options = partCatalog.filter(part => part.slot === slot && (state.parts?.[part.id] ?? 0) > 0); return `<div class="part-slot"><div class="part-slot-head"><b>${t[slot]}</b><span>${equipped ? `${equipped.name[state.language]} · +${equipped.power} ${t.powerShort} / +${equipped.handling} ${t.handlingShort}` : t.emptySlot}</span></div><div class="part-options">${options.length ? options.map(part => `<button data-install-part="${part.id}" data-slot="${slot}" class="part-chip ${part.tier}">${part.name[state.language]} <small>×${state.parts[part.id]}</small></button>`).join('') : `<small class="part-empty">${t.noParts}</small>`}</div></div>`; }).join('')}</div>
      </article>
      <div class="section-head collection-head"><div><span class="eyebrow">YOUR LINEUP</span><h2>${t.collection}</h2></div></div>
      <div class="car-grid">${state.cars.map(car => `<button data-car="${car.id}" ${!car.owned ? 'disabled' : ''} class="car-tile ${car.id === selected.id ? 'selected' : ''}">${carImage(car.id,'tile-image')}<span class="tile-tier ${car.tier}">${car.tier.toUpperCase()}</span><b>${car.name}</b><small>${car.owned ? t.owned : t.locked}</small></button>`).join('')}</div>`
      : tab === 'cases' ? `
      <div class="section-head"><div><span class="eyebrow">02 / DROP ZONE</span><h2>${t.cases}</h2></div><span class="count-pill">CASE <small>01</small></span></div>
      <article class="case-panel"><div class="case-glow"></div><div class="case-label">${t.streetCase}</div><img class="case-image" src="${import.meta.env.BASE_URL}cars/street-case.svg" alt="Street case"/><div class="case-name">STREET <b>CASE</b></div><p>Cars, parts and duplicate compensation.</p><button id="open" class="primary-button"><span>✦</span><span>${t.open}<small>250 ◈</small></span><b>↗</b></button></article>
      <div class="odds-card"><h3>${t.odds}</h3><div><span><i class="rarity common"></i>${t.common}</span><b>70%</b></div><div><span><i class="rarity rare"></i>${t.rare}</span><b>25%</b></div><div><span><i class="rarity epic"></i>${t.epic}</span><b>5%</b></div><small>Each case keeps the existing car odds. 50% extra part drop chance; duplicate cars grant credit compensation.</small></div>`
      : `
      <div class="section-head"><div><span class="eyebrow">03 / RACE CONTROL</span><h2>${t.races}</h2></div><span class="count-pill">SPRINT <small>01</small></span></div>
      <article class="race-panel"><div class="race-top"><span class="eyebrow">NIGHT CIRCUIT</span><span class="live-dot">● READY</span></div><h3>${t.raceTitle}</h3><p>${t.raceDesc}</p><div class="race-track"><div class="track-glow"></div><div class="track-stripe"></div>${carImage(selected.id,'race-car player-car')}<img class="race-car rival-car" src="${import.meta.env.BASE_URL}cars/vortex.svg" alt="Rival car"/><span class="finish-line">FINISH</span></div><div class="race-stats"><span>YOUR CAR <b>${selected.name}</b></span><span>${t.power} <b>${getCarStats(state, selected.id).power}</b></span></div><button id="race" class="primary-button"><span>▶</span><span>${t.startRace}<small>REWARD UP TO 180 ◈ + XP</small></span><b>↗</b></button></article>`
    }</section>
    ${notice ? `<div class="notice ${noticeKind}" role="status">${notice}</div>` : ''}
    <section class="history"><div class="history-head"><h3>${t.history}</h3><span>RECENT</span></div>${state.history.length ? state.history.slice(0,3).map((event,i) => `<div class="history-item"><span class="history-index">0${i+1}</span><span>${event}</span><i>↗</i></div>`).join('') : `<p class="empty-history">${t.empty}</p>`}</section>
    <section class="achievements"><div class="history-head"><h3>${t.achievements}</h3><span>${state.cars.filter(car => car.owned).length}/${state.cars.length} CARS</span></div>
      ${[
        { id: 'case', title: t.achFirstCase, desc: t.achFirstCaseDesc, progress: Math.min(state.casesOpened, 1), goal: 1, icon: '✦' },
        { id: 'wins', title: t.achRaceWins, desc: t.achRaceWinsDesc, progress: Math.min(state.racesWon, 5), goal: 5, icon: '↗' },
        { id: 'collector', title: t.achCollector, desc: t.achCollectorDesc, progress: state.cars.filter(car => car.owned).length, goal: state.cars.length, icon: '▰' },
        { id: 'tuner', title: t.achTuner, desc: t.achTunerDesc, progress: Math.min(state.upgradesPurchased, 5), goal: 5, icon: '⚙' }
      ].map(a => `<article class="achievement ${a.progress >= a.goal ? 'unlocked' : ''}"><span class="achievement-icon">${a.icon}</span><div class="achievement-copy"><b>${a.title}</b><small>${a.desc}</small><div class="achievement-meter"><i style="width:${Math.min(100, a.progress / a.goal * 100)}%"></i></div></div><span class="achievement-progress">${a.progress}/${a.goal}</span></article>`).join('')}
    </section>
    <footer><span class="footer-mark">CR</span><span>${t.demo}</span></footer>
  </main>`;
  root.querySelector('#lang')?.addEventListener('click', () => { state.language = (state.language === 'ru' ? 'uk' : 'ru') as Language; notice = ''; save(); render(); });
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.tab as Tab; notice = ''; render(); }));
  root.querySelectorAll<HTMLButtonElement>('[data-car]').forEach(button => button.addEventListener('click', () => { state.selectedCarId = button.dataset.car!; notice = ''; save(); render(); }));
  root.querySelector('#open')?.addEventListener('click', () => {
    const button = root.querySelector<HTMLButtonElement>('#open');
    const panel = root.querySelector<HTMLElement>('.case-panel');
    if (!button || button.disabled) return;
    button.disabled = true;
    panel?.classList.add('opening');
    button.querySelector('span:nth-child(2)')?.insertAdjacentHTML('beforeend', `<small class="opening-label">${state.language === 'ru' ? 'ОТКРЫВАЕМ…' : 'ВІДКРИВАЄМО…'}</small>`);
    window.setTimeout(() => perform(() => {
      const previous = state.cars.map(car => car.owned);
      const carRoll = Math.random(); const partChanceRoll = Math.random(); const partTierRoll = Math.random(); const partSlotRoll = Math.random();
      const part = partChanceRoll < 0.5 ? getPartDrop(partTierRoll, partSlotRoll) : null;
      state = openCase(state, carRoll, partChanceRoll, partTierRoll, partSlotRoll);
      const prize = state.cars.find((car, i) => car.owned && !previous[i]);
      notice = [prize ? `${t.caseReceived} ${prize.name}` : t.duplicate, part ? `${state.language === 'ru' ? 'ДЕТАЛЬ' : 'ДЕТАЛЬ'}: ${part.name[state.language]}` : ''].filter(Boolean).join(' · ');
      noticeKind = 'good';
    }), 1350);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-install-part]').forEach(button => button.addEventListener('click', () => perform(() => {
    state = installPart(state, button.dataset.slot as PartSlot, button.dataset.installPart!);
    const part = partCatalog.find(item => item.id === button.dataset.installPart);
    notice = `${t.installed}: ${part?.name[state.language] ?? ''}`;
    noticeKind = 'good';
  })));
  
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
