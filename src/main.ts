import './style.css';
import cometSvg from './cars/comet.svg?raw';
import vortexSvg from './cars/vortex.svg?raw';
import phantomSvg from './cars/phantom.svg?raw';
import { initTelegramWebApp } from './telegram';
import { initialState, openCase, race, careerRace, careerStages, safeLoad, getCarStats, installPart, getPartDrop, partCatalog, type GameState, type Language, type PartSlot, type CarAppearance } from './game';
type Tab = 'garage' | 'cases' | 'races';
const copy = {
  ru: {
    garage: 'Гараж', cases: 'Кейсы', races: 'Гонки', subtitle: 'Твоя коллекция. Твои правила.',
    credits: 'КРЕДИТЫ', level: 'УРОВЕНЬ', collection: 'Моя коллекция', owned: 'В гараже', locked: 'Не получена',
    power: 'МОЩНОСТЬ', handling: 'УПРАВЛЯЕМОСТЬ', upgrade: 'Улучшить двигатель', cost: 'Стоимость', open: 'Открыть кейс', parts: 'Мастерская деталей', partDrop: 'Шанс детали: 50%', engine: 'Двигатель', turbo: 'Турбина', tires: 'Шины', ecu: 'ЭБУ', emptySlot: 'Слот пуст', noParts: 'Нет деталей этого типа — открывай кейсы', powerShort: 'мощн.', handlingShort: 'упр.', installed: 'Деталь установлена',
    streetCase: 'УЛИЧНЫЙ КЕЙС', odds: 'Шансы выпадения', common: 'Обычная', rare: 'Редкая', epic: 'Эпическая',
    raceTitle: 'УЛИЧНЫЙ СПРИНТ', raceDesc: 'Подготовь сборку. Светофор погаснет — держись до финиша.', raceRewardLine: 'ПОБЕДА +90 ◈ · ПРОИГРЫШ +10 ◈ · XP', raceRunning: 'ЗАЕЗД ИДЁТ…', raceLights: 'ГОТОВЬСЯ К СТАРТУ',
    startRace: 'Начать заезд', win: 'ПОБЕДА!', loss: 'В СЛЕДУЮЩИЙ РАЗ!', result: 'Результат заезда',
    history: 'Последние события', empty: 'Пока тихо. Первый заезд уже ждёт.', insufficient: 'Недостаточно кредитов',
    caseReceived: 'Новый автомобиль в коллекции!', duplicate: 'Повторная машина: начислена компенсация.',
    upgraded: 'Двигатель улучшен: +10 мощности', demo: 'ПРОТОТИП · СОХРАНЕНИЕ НА ЭТОМ УСТРОЙСТВЕ',
    intro: 'Открывай кейсы, собирай машины и выходи на старт.', raceReward: 'Награда за заезд начислена', career: 'Карьера', sprint: 'Спринт', careerTitle: 'КАРЬЕРА УЛИЧНОГО ГОНЩИКА', careerDesc: 'Этапы становятся сложнее; пройденный этап больше не оплачивается повторно.', stage: 'ЭТАП', opponent: 'СИЛА СОПЕРНИКА', requiredPower: 'Нужна мощность', requiredHandling: 'Нужна управляемость', requiredParts: 'Обязательные детали', noPartsRequired: 'Детали не требуются', careerReward: 'Награда за этап', streak: 'СЕРИЯ ПОБЕД', careerComplete: 'КАРЬЕРА ПРОЙДЕНА · ВСЕ 8 ЭТАПОВ', ready: 'СБОРКА ГОТОВА', notReady: 'НУЖНА НАСТРОЙКА', bonus: 'БОНУС СЕРИИ', achievements: 'Достижения', achFirstCase: 'Первый дроп', achFirstCaseDesc: 'Открой первый кейс', achRaceWins: 'Гонщик', achRaceWinsDesc: 'Выиграй 5 заездов', achCollector: 'Коллекционер', achCollectorDesc: 'Собери все 3 машины', achTuner: 'Механик', achTunerDesc: 'Установи 4 детали', completed: 'ВЫПОЛНЕНО', inProgress: 'В ПРОЦЕССЕ'
  },
  uk: {
    garage: 'Гараж', cases: 'Кейси', races: 'Перегони', subtitle: 'Твоя колекція. Твої правила.',
    credits: 'КРЕДИТИ', level: 'РІВЕНЬ', collection: 'Моя колекція', owned: 'У гаражі', locked: 'Не отримано',
    power: 'ПОТУЖНІСТЬ', handling: 'КЕРОВАНІСТЬ', upgrade: 'Покращити двигун', cost: 'Вартість', open: 'Відкрити кейс', parts: 'Майстерня деталей', partDrop: 'Шанс деталі: 50%', engine: 'Двигун', turbo: 'Турбіна', tires: 'Шини', ecu: 'ЕБУ', emptySlot: 'Слот порожній', noParts: 'Немає деталей цього типу — відкривай кейси', powerShort: 'потужн.', handlingShort: 'кер.', installed: 'Деталь встановлено',
    streetCase: 'ВУЛИЧНИЙ КЕЙС', odds: 'Шанси випадіння', common: 'Звичайна', rare: 'Рідкісна', epic: 'Епічна',
    raceTitle: 'ВУЛИЧНИЙ СПРИНТ', raceDesc: 'Підготуй збірку. Світлофор згасне — тримайся до фінішу.', raceRewardLine: 'ПЕРЕМОГА +90 ◈ · ПОРАЗКА +10 ◈ · XP', raceRunning: 'ЗАЇЗД ТРИВАЄ…', raceLights: 'ГОТУЙСЯ ДО СТАРТУ',
    startRace: 'Почати заїзд', win: 'ПЕРЕМОГА!', loss: 'НАСТУПНОГО РАЗУ!', result: 'Результат заїзду',
    history: 'Останні події', empty: 'Поки тихо. Перший заїзд уже чекає.', insufficient: 'Недостатньо кредитів',
    caseReceived: 'Нове авто в колекції!', duplicate: 'Повторне авто: нараховано компенсацію.',
    upgraded: 'Двигун покращено: +10 потужності', demo: 'ПРОТОТИП · ЗБЕРЕЖЕННЯ НА ЦЬОМУ ПРИСТРОЇ',
    intro: 'Відкривай кейси, збирай авто та виходь на старт.', raceReward: 'Нагороду за заїзд нараховано', career: 'Кар’єра', sprint: 'Спринт', careerTitle: 'КАР’ЄРА ВУЛИЧНОГО ГОНЩИКА', careerDesc: 'Етапи стають складнішими; пройдений етап більше не оплачується повторно.', stage: 'ЕТАП', opponent: 'СИЛА СУПЕРНИКА', requiredPower: 'Потрібна потужність', requiredHandling: 'Потрібна керованість', requiredParts: 'Обов’язкові деталі', noPartsRequired: 'Деталі не потрібні', careerReward: 'Нагорода за етап', streak: 'СЕРІЯ ПЕРЕМОГ', careerComplete: 'КАР’ЄРУ ПРОЙДЕНО · УСІ 8 ЕТАПІВ', ready: 'ЗБІРКА ГОТОВА', notReady: 'ПОТРІБНЕ НАЛАШТУВАННЯ', bonus: 'БОНУС СЕРІЇ', achievements: 'Досягнення', achFirstCase: 'Перший дроп', achFirstCaseDesc: 'Відкрий перший кейс', achRaceWins: 'Гонщик', achRaceWinsDesc: 'Виграй 5 заїздів', achCollector: 'Колекціонер', achCollectorDesc: 'Збери всі 3 авто', achTuner: 'Механік', achTunerDesc: 'Встанови 4 деталі', completed: 'ВИКОНАНО', inProgress: 'У ПРОЦЕСІ'
  }
};
const key = 'case-rush-save-v1';
let state: GameState;
try { state = safeLoad(localStorage.getItem(key)); } catch { state = initialState(); }
let tab: Tab = 'garage';
let raceMode: 'sprint' | 'career' = 'career';
let notice = '';
let noticeKind: 'good' | 'bad' = 'good';
let rewardReveal: { carId: string | null; partName: string; duplicate: boolean; tier: 'common' | 'rare' | 'epic' } | null = null;
const root = document.querySelector<HTMLDivElement>('#app')!;
initTelegramWebApp();
function save(): void { try { localStorage.setItem(key, JSON.stringify(state)); } catch { notice = 'Storage unavailable'; noticeKind = 'bad'; } }
const carSvgSources: Record<string, string> = { comet: cometSvg, vortex: vortexSvg, phantom: phantomSvg };
let carSvgInstance = 0;
function carImage(id: string, extra = ''): string {
  const mods = Object.entries(state.installedParts?.[id] ?? {}).map(([slot]) => `mod-${slot}`).join(' ');
  const a = state.appearance?.[id] ?? { body: 'factory', neon: 'mint', bodyKit: 'street' };
  const prefix = `cr${++carSvgInstance}`;
  const ids = new Map<string, string>();
  let svg = (carSvgSources[id] ?? carSvgSources.comet).replace(/id="([^"]+)"/g, (_match, original: string) => {
    const unique = `${prefix}-${original}`; ids.set(original, unique); return `id="${unique}"`;
  });
  svg = svg.replace(/url\(#([^)]+)\)/g, (_match, original: string) => `url(#${ids.get(original) ?? original})`);
  return svg.replace('<svg ', `<svg class="car-image ${extra} ${mods} body-${a.body} neon-${a.neon} kit-${a.bodyKit}" role="img" aria-label="${id}" focusable="false" `);
}
function installedModBadges(id: string): string { const labels: Record<string, string> = { engine: 'ENGINE', turbo: 'TURBO', tires: 'RACE TYRES', ecu: 'ECU' }; return `<div class="car-mods-overlay">${Object.entries(state.installedParts?.[id] ?? {}).map(([slot]) => `<span class="mod-badge mod-badge-${slot}">✦ ${labels[slot] ?? slot.toUpperCase()}</span>`).join('')}</div>`; }
function render(): void {
  const t = copy[state.language];
  const selected = state.cars.find(car => car.id === state.selectedCarId && car.owned) ?? state.cars.find(car => car.owned)!;
  const careerStage = careerStages[state.careerStage - 1];
  const careerStats = getCarStats(state, selected.id);
  const careerInstalled = state.installedParts?.[selected.id] ?? {};
  const careerEligible = Boolean(careerStage && careerStats.power >= careerStage.requiredPower && careerStats.handling >= careerStage.requiredHandling && careerStage.requiredParts.every(slot => Boolean(careerInstalled[slot])));
  const careerPartNames: Record<PartSlot, string> = { engine: t.engine, turbo: t.turbo, tires: t.tires, ecu: t.ecu };
  const appearance = state.appearance?.[selected.id] ?? { body: 'factory', neon: 'mint', bodyKit: 'street' };
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
      <article class="featured-car"><div class="car-backdrop"></div><div class="car-tag">${selected.tier.toUpperCase()} CLASS <span>•</span> #${selected.id.toUpperCase()}</div>${carImage(selected.id, 'featured-image')}${installedModBadges(selected.id)}<div class="car-info"><div><h3>${selected.name}</h3><p>STREET SERIES <span>·</span> MODEL 2026</p></div><span class="tier-dot ${selected.tier}"></span></div>
        <div class="stat-grid"><div class="stat"><div><span>${t.power}</span><b>${getCarStats(state, selected.id).power}</b></div><div class="meter"><i style="width:${Math.min(100, getCarStats(state, selected.id).power / 3)}%"></i></div></div><div class="stat"><div><span>${t.handling}</span><b>${getCarStats(state, selected.id).handling}</b></div><div class="meter"><i style="width:${getCarStats(state, selected.id).handling}%"></i></div></div></div>
        <div class="parts-workbench"><div class="parts-head"><h3>${t.parts}</h3><span>${t.partDrop}</span></div>${(['engine','turbo','tires','ecu'] as PartSlot[]).map(slot => { const equippedId = state.installedParts?.[selected.id]?.[slot]; const equipped = partCatalog.find(part => part.id === equippedId); const options = partCatalog.filter(part => part.slot === slot && (state.parts?.[part.id] ?? 0) > 0); return `<div class="part-slot"><div class="part-slot-head"><b>${t[slot]}</b><span>${equipped ? `${equipped.name[state.language]} · +${equipped.power} ${t.powerShort} / +${equipped.handling} ${t.handlingShort}` : t.emptySlot}</span></div><div class="part-options">${options.length ? options.map(part => `<button data-install-part="${part.id}" data-slot="${slot}" class="part-chip ${part.tier}">${part.name[state.language]} <small>×${state.parts[part.id]}</small></button>`).join('') : `<small class="part-empty">${t.noParts}</small>`}</div></div>`; }).join('')}</div>
      </article>
      <section class="customizer" aria-label="Car appearance customization">
        <div class="customizer-head"><div><span class="eyebrow">GARAGE STUDIO</span><h3>Настройка внешности</h3></div><span class="customizer-live">LIVE PREVIEW</span></div>
        <div class="customizer-group"><span>ЦВЕТ КУЗОВА</span><div class="customizer-options">${[['factory','Заводской'],['crimson','Красный'],['blue','Синий'],['violet','Фиолетовый'],['gold','Золотой']].map(([value,label])=>`<button class="swatch swatch-${value} ${appearance.body===value?'chosen':''}" data-appearance="body" data-value="${value}" aria-label="${label}" title="${label}"><i></i><small>${label}</small></button>`).join('')}</div></div>
        <div class="customizer-group"><span>НЕОНОВАЯ ПОДСВЕТКА</span><div class="customizer-options">${[['mint','Мята'],['blue','Лёд'],['pink','Магента'],['amber','Янтарь']].map(([value,label])=>`<button class="neon-choice neon-choice-${value} ${appearance.neon===value?'chosen':''}" data-appearance="neon" data-value="${value}"><i></i>${label}</button>`).join('')}</div></div>
        <div class="customizer-group"><span>ОБВЕС</span><div class="kit-options">${[['street','Street'],['wide','Widebody'],['track','Track Pro']].map(([value,label])=>`<button class="kit-choice ${appearance.bodyKit===value?'chosen':''}" data-appearance="bodyKit" data-value="${value}"><b>${label}</b><small>${value==='street'?'Чистый силуэт':value==='wide'?'Расширенные арки':'Спортивная аэродинамика'}</small></button>`).join('')}</div></div>
      </section>
      <div class="section-head collection-head"><div><span class="eyebrow">YOUR LINEUP</span><h2>${t.collection}</h2></div></div>
      <div class="car-grid">${state.cars.map(car => `<button data-car="${car.id}" ${!car.owned ? 'disabled' : ''} class="car-tile ${car.id === selected.id ? 'selected' : ''}">${carImage(car.id,'tile-image')}<span class="tile-tier ${car.tier}">${car.tier.toUpperCase()}</span><b>${car.name}</b><small>${car.owned ? t.owned : t.locked}</small></button>`).join('')}</div>`
      : tab === 'cases' ? `
      <div class="section-head"><div><span class="eyebrow">02 / DROP ZONE</span><h2>${t.cases}</h2></div><span class="count-pill">CASE <small>01</small></span></div>
      <article class="case-panel"><div class="case-glow"></div><div class="case-scanline"></div><div class="case-orbit orbit-one"></div><div class="case-orbit orbit-two"></div><div class="case-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="case-label"><span class="live-dot">●</span> ${t.streetCase} <span class="case-season">SERIES 01</span></div><div class="case-stage"><div class="case-floor"></div><img class="case-image" src="${import.meta.env.BASE_URL}cars/street-case.svg" alt="Street case"/><span class="case-stage-mark">CR <b>01</b></span></div><div class="case-name">STREET <b>CASE</b></div><div class="case-subtitle">UNLOCK YOUR NEXT LEGEND</div><p>Cars, parts and duplicate compensation.</p><div class="case-reward-types"><span>▰ CAR DROP</span><span>⚙ PARTS</span><span>◈ BONUS</span></div><button id="open" class="primary-button"><span>✦</span><span>${t.open}<small>250 ◈</small></span><b>↗</b></button></article>
      <div class="odds-card"><h3>${t.odds}</h3><div><span><i class="rarity common"></i>${t.common}</span><b>70%</b></div><div><span><i class="rarity rare"></i>${t.rare}</span><b>25%</b></div><div><span><i class="rarity epic"></i>${t.epic}</span><b>5%</b></div><small>Each case keeps the existing car odds. 50% extra part drop chance; duplicate cars grant credit compensation.</small></div>`
      : `
      <div class="section-head"><div><span class="eyebrow">03 / RACE CONTROL</span><h2>${t.races}</h2></div><span class="count-pill">SPRINT <small>01</small></span></div>
      <div class="race-mode-switch"><button data-race-mode="career" class="${raceMode === 'career' ? 'active' : ''}">🏆 ${t.career}</button><button data-race-mode="sprint" class="${raceMode === 'sprint' ? 'active' : ''}">⚡ ${t.sprint}</button></div><article class="career-card" style="display:${raceMode === 'career' ? 'block' : 'none'}"><div class="career-card-top"><span class="eyebrow">${t.careerTitle}</span><span class="career-stage-pill">${careerStage ? `${t.stage} ${careerStage.id}/8` : '8/8'}</span></div>${careerStage ? `<h3>${careerStage.title[state.language]}</h3><p>${t.careerDesc}</p><div class="career-goal-grid"><div class="career-goal ${careerStats.power >= careerStage.requiredPower ? 'goal-met' : 'goal-missing'}"><span>${t.requiredPower}</span><b>${careerStats.power} <small>/ ${careerStage.requiredPower}</small></b><i><em style="width:${Math.min(100, careerStats.power / careerStage.requiredPower * 100)}%"></em></i></div><div class="career-goal ${careerStats.handling >= careerStage.requiredHandling ? 'goal-met' : 'goal-missing'}"><span>${t.requiredHandling}</span><b>${careerStats.handling} <small>/ ${careerStage.requiredHandling}</small></b><i><em style="width:${Math.min(100, careerStats.handling / careerStage.requiredHandling * 100)}%"></em></i></div></div><div class="career-parts-row"><span>${t.requiredParts}</span><div>${careerStage.requiredParts.length ? careerStage.requiredParts.map(slot => `<b class="${careerInstalled[slot] ? 'part-ready' : 'part-needed'}">${careerInstalled[slot] ? '✓' : '＋'} ${careerPartNames[slot]}</b>`).join('') : `<b class="part-ready">✓ ${t.noPartsRequired}</b>`}</div></div><div class="career-opponent"><span>◈ ${t.opponent}</span><b>${careerStage.opponentPower}</b><span class="career-track-name track-${careerStage.track}">▰ ${careerStage.track.toUpperCase()} CIRCUIT</span></div><div class="career-reward"><span>${t.careerReward}</span><b>+ ${careerStage.reward} ◈</b><small>${t.streak}: ${state.careerStreak} · ${t.bonus}: +120 (3) / +200 (6)</small></div>` : `<h3>${t.careerComplete}</h3><p>${state.careerWins}/8 · ${t.streak}: ${state.careerStreak}</p>`}<div class="race-track track-theme-${careerStage?.track ?? 'night'}"><div class="track-glow"></div><div class="track-stripe"></div><div class="speed-lines" aria-hidden="true"></div>${carImage(selected.id, 'race-car player-car')}<img class="race-car rival-car" src="${import.meta.env.BASE_URL}cars/vortex.svg" alt="Rival car"/><span class="finish-line">FINISH</span><span class="race-finish-flash" aria-hidden="true"></span></div><div class="race-lights" aria-hidden="true"><span>${careerEligible ? t.ready : t.notReady}</span><i></i><i></i><i></i></div><div class="race-progress" aria-hidden="true"><i></i></div><div class="race-stats"><span>YOUR CAR <b>${selected.name}</b></span><span>${t.power} <b>${careerStats.power}</b></span></div><button id="career-race" class="primary-button" ${careerStage ? '' : 'disabled'}><span>🏁</span><span>${t.startRace}<small>${careerStage ? `${t.careerReward}: +${careerStage.reward} ◈ · ${t.opponent}: ${careerStage.opponentPower}` : t.careerComplete}</small></span><b>↗</b></button></article><article class="race-panel" style="display:${raceMode === 'sprint' ? 'block' : 'none'}"><div class="race-top"><span class="eyebrow">NIGHT CIRCUIT</span><span class="live-dot">● READY</span></div><h3>${t.raceTitle}</h3><p>${t.raceDesc}</p><div class="race-lights" aria-hidden="true"><span>${t.raceLights}</span><i></i><i></i><i></i></div><div class="race-track"><div class="track-glow"></div><div class="track-stripe"></div><div class="speed-lines" aria-hidden="true"></div>${carImage(selected.id,'race-car player-car')}<img class="race-car rival-car" src="${import.meta.env.BASE_URL}cars/vortex.svg" alt="Rival car"/><span class="finish-line">FINISH</span><span class="race-finish-flash" aria-hidden="true"></span></div><div class="race-progress" aria-hidden="true"><i></i></div><div class="race-stats"><span>YOUR CAR <b>${selected.name}</b></span><span>${t.power} <b>${getCarStats(state, selected.id).power}</b></span></div><button id="race" class="primary-button"><span>▶</span><span>${t.startRace}<small>${t.raceRewardLine}</small></span><b>↗</b></button></article>`
    }</section>
    ${notice ? `<div class="notice ${noticeKind}" role="status">${notice}</div>` : ''}
    ${rewardReveal ? `<div class="reward-reveal-backdrop rarity-${rewardReveal.tier}"><article class="reward-reveal-card rarity-${rewardReveal.tier}"><div class="reward-confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="reward-kicker">CASE RUSH · REWARD CONFIRMED</div><div class="reward-stamp">${rewardReveal.carId ? 'NEW CAR' : rewardReveal.partName ? 'PART DROP' : 'CASE OPENED'}</div>${rewardReveal.carId ? carImage(rewardReveal.carId, 'reward-car-image') : '<div class="reward-part-icon">⚙</div>'}<h2>${rewardReveal.carId ? state.cars.find(car => car.id === rewardReveal!.carId)?.name ?? 'NEW CAR' : rewardReveal.partName || (state.language === 'ru' ? 'Дубликат · компенсация начислена' : 'Дублікат · компенсацію нараховано')}</h2><p>${rewardReveal.partName ? `✦ ${rewardReveal.partName}` : rewardReveal.carId ? 'ADDED TO YOUR GARAGE' : 'CREDITS COMPENSATION ADDED'}</p><button id="close-reveal" class="primary-button"><span>✦</span><span>${state.language === 'ru' ? 'Забрать награду' : 'Забрати нагороду'}</span><b>↗</b></button></article></div>` : ''}
    <section class="history"><div class="history-head"><h3>${t.history}</h3><span>RECENT</span></div>${state.history.length ? state.history.slice(0,3).map((event,i) => `<div class="history-item"><span class="history-index">0${i+1}</span><span>${event}</span><i>↗</i></div>`).join('') : `<p class="empty-history">${t.empty}</p>`}</section>
    <section class="achievements"><div class="history-head"><h3>${t.achievements}</h3><span>${state.cars.filter(car => car.owned).length}/${state.cars.length} CARS</span></div>
      ${[
        { id: 'case', title: t.achFirstCase, desc: t.achFirstCaseDesc, progress: Math.min(state.casesOpened, 1), goal: 1, icon: '✦' },
        { id: 'wins', title: t.achRaceWins, desc: t.achRaceWinsDesc, progress: Math.min(state.racesWon, 5), goal: 5, icon: '↗' },
        { id: 'collector', title: t.achCollector, desc: t.achCollectorDesc, progress: state.cars.filter(car => car.owned).length, goal: state.cars.length, icon: '▰' },
        { id: 'tuner', title: t.achTuner, desc: t.achTunerDesc, progress: Math.min(Object.values(state.installedParts ?? {}).reduce((total, slots) => total + Object.keys(slots).length, 0), 4), goal: 4, icon: '⚙' }
      ].map(a => `<article class="achievement ${a.progress >= a.goal ? 'unlocked' : ''}"><span class="achievement-icon">${a.icon}</span><div class="achievement-copy"><b>${a.title}</b><small>${a.desc}</small><div class="achievement-meter"><i style="width:${Math.min(100, a.progress / a.goal * 100)}%"></i></div></div><span class="achievement-progress">${a.progress}/${a.goal}</span></article>`).join('')}
    </section>
    <footer><span class="footer-mark">CR</span><span>${t.demo}</span></footer>
  </main>`;
  root.querySelector('#close-reveal')?.addEventListener('click', () => { rewardReveal = null; render(); });
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
      rewardReveal = { carId: prize?.id ?? null, partName: part?.name[state.language] ?? '', duplicate: !prize, tier: prize?.tier ?? part?.tier ?? 'common' };
    }), 1900);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-appearance]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.appearance as keyof CarAppearance;
    const value = button.dataset.value ?? '';
    const valid: Record<keyof CarAppearance, string[]> = { body: ['factory','crimson','blue','violet','gold'], neon: ['mint','blue','pink','amber'], bodyKit: ['street','wide','track'] };
    if (!valid[kind]?.includes(value)) return;
    state.appearance = { ...(state.appearance ?? {}), [selected.id]: { ...(state.appearance?.[selected.id] ?? { body: 'factory', neon: 'mint', bodyKit: 'street' }), [kind]: value } };
    notice = state.language === 'ru' ? 'Внешность автомобиля обновлена' : 'Зовнішність автомобіля оновлено';
    noticeKind = 'good'; save(); render();
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-install-part]').forEach(button => button.addEventListener('click', () => {
    perform(() => {
      state = installPart(state, button.dataset.slot as PartSlot, button.dataset.installPart!);
      const part = partCatalog.find(item => item.id === button.dataset.installPart);
      notice = `${t.installed}: ${part?.name[state.language] ?? ''}`;
      noticeKind = 'good';
    });
    root.querySelector('.featured-car')?.classList.add('part-installing');
    window.setTimeout(() => root.querySelector('.featured-car')?.classList.remove('part-installing'), 950);
  }));
  
  root.querySelectorAll<HTMLButtonElement>('[data-race-mode]').forEach(button => button.addEventListener('click', () => { raceMode = button.dataset.raceMode as 'career' | 'sprint'; notice = ''; render(); }));
  root.querySelector('#career-race')?.addEventListener('click', () => {
    const button = root.querySelector<HTMLButtonElement>('#career-race'); const panel = root.querySelector<HTMLElement>('.career-card');
    if (!button || button.disabled || !panel) return; button.disabled = true; panel.classList.add('racing');
    const label = button.querySelector('span:nth-child(2)'); if (label) label.innerHTML = t.raceRunning + '<small>' + t.careerReward + '</small>';
    window.setTimeout(() => perform(() => { const result = careerRace(state, Math.random()); state = result.state; notice = result.won ? t.win + ' · +' + result.reward + ' ◈' + (result.bonus ? ' · ' + t.bonus + ' +' + result.bonus : '') : (result.eligible ? t.loss : t.notReady) + ' · 0 ◈'; noticeKind = result.won ? 'good' : 'bad'; }), 2800);
  });
  root.querySelector('#race')?.addEventListener('click', () => {
    const button = root.querySelector<HTMLButtonElement>('#race');
    const panel = root.querySelector<HTMLElement>('.race-panel');
    if (!button || button.disabled || !panel) return;
    button.disabled = true;
    panel.classList.add('racing');
    const status = panel.querySelector<HTMLElement>('.live-dot');
    if (status) status.textContent = '● ' + t.raceRunning;
    const label = button.querySelector('span:nth-child(2)');
    if (label) label.innerHTML = t.raceRunning + '<small>' + t.raceRewardLine + '</small>';
    window.setTimeout(() => perform(() => {
      const result = race(state, Math.random());
      state = result.state;
      notice = result.won ? t.win + ' · +90 ◈' : t.loss + ' · +10 ◈';
      noticeKind = result.won ? 'good' : 'bad';
    }), 2800);
  });
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
