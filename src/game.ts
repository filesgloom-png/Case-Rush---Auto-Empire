export type Language = 'ru' | 'uk';
export type Car = { id: string; name: string; tier: 'common' | 'rare' | 'epic'; power: number; handling: number; owned: boolean };
export type PartSlot = 'engine' | 'turbo' | 'tires' | 'ecu';
export type PartTier = 'common' | 'rare' | 'epic';
export type PartDefinition = { id: string; name: Record<Language, string>; slot: PartSlot; tier: PartTier; power: number; handling: number };
export type CarAppearance = { body: 'factory' | 'crimson' | 'blue' | 'violet' | 'gold'; neon: 'mint' | 'blue' | 'pink' | 'amber'; bodyKit: 'street' | 'wide' | 'track' };
export const DEFAULT_APPEARANCE: CarAppearance = { body: 'factory', neon: 'mint', bodyKit: 'street' };
export type GameState = { appearance: Record<string, CarAppearance>; credits: number; level: number; xp: number; language: Language; cars: Car[]; selectedCarId: string; history: string[]; casesOpened: number; racesWon: number; upgradesPurchased: number; parts: Record<string, number>; installedParts: Record<string, Partial<Record<PartSlot, string>>> };
export const CASE_COST = 250;
export const UPGRADE_COST = 300;
export const MAX_CREDITS = Number.MAX_SAFE_INTEGER;
export const MAX_XP = 1_000_000_000;
export const MAX_PROGRESS_COUNTER = 1_000_000_000;
export const starterCars: Car[] = [
  { id: 'comet', name: 'Comet S1', tier: 'common', power: 105, handling: 66, owned: true },
  { id: 'vortex', name: 'Vortex GT', tier: 'rare', power: 160, handling: 74, owned: false },
  { id: 'phantom', name: 'Phantom XR', tier: 'epic', power: 230, handling: 82, owned: false }
];
export const partCatalog: PartDefinition[] = [
  { id: 'engine-common', name: { ru: 'Спортивный фильтр', uk: 'Спортивний фільтр' }, slot: 'engine', tier: 'common', power: 6, handling: 0 },
  { id: 'engine-rare', name: { ru: 'Кованый двигатель', uk: 'Кований двигун' }, slot: 'engine', tier: 'rare', power: 14, handling: 1 },
  { id: 'engine-epic', name: { ru: 'Гоночный мотор', uk: 'Гоночний мотор' }, slot: 'engine', tier: 'epic', power: 24, handling: 2 },
  { id: 'turbo-common', name: { ru: 'Турбина Street', uk: 'Турбіна Street' }, slot: 'turbo', tier: 'common', power: 9, handling: 0 },
  { id: 'turbo-rare', name: { ru: 'Twin Turbo', uk: 'Twin Turbo' }, slot: 'turbo', tier: 'rare', power: 18, handling: 0 },
  { id: 'turbo-epic', name: { ru: 'Турбина Overdrive', uk: 'Турбіна Overdrive' }, slot: 'turbo', tier: 'epic', power: 30, handling: 0 },
  { id: 'tires-common', name: { ru: 'Полуслики', uk: 'Напівсліки' }, slot: 'tires', tier: 'common', power: 0, handling: 4 },
  { id: 'tires-rare', name: { ru: 'Гоночные шины', uk: 'Гоночні шини' }, slot: 'tires', tier: 'rare', power: 0, handling: 8 },
  { id: 'tires-epic', name: { ru: 'Слики Pro', uk: 'Сліки Pro' }, slot: 'tires', tier: 'epic', power: 0, handling: 13 },
  { id: 'ecu-common', name: { ru: 'Чип Stage 1', uk: 'Чип Stage 1' }, slot: 'ecu', tier: 'common', power: 5, handling: 1 },
  { id: 'ecu-rare', name: { ru: 'Чип Stage 2', uk: 'Чип Stage 2' }, slot: 'ecu', tier: 'rare', power: 11, handling: 2 },
  { id: 'ecu-epic', name: { ru: 'ЭБУ Racing', uk: 'ЕБУ Racing' }, slot: 'ecu', tier: 'epic', power: 18, handling: 4 }
];
const emptyParts = (): Record<string, number> => Object.fromEntries(partCatalog.map(part => [part.id, 0]));
const emptyInstalled = (): Record<string, Partial<Record<PartSlot, string>>> => Object.fromEntries(starterCars.map(car => [car.id, {}]));
export function initialState(): GameState {
  return { appearance: Object.fromEntries(starterCars.map(car => [car.id, { ...DEFAULT_APPEARANCE }])), credits: 1000, level: 1, xp: 0, language: 'ru', cars: starterCars.map(car => ({ ...car })), selectedCarId: 'comet', history: [], casesOpened: 0, racesWon: 0, upgradesPurchased: 0, parts: emptyParts(), installedParts: emptyInstalled() };
}
export function getPartDrop(tierRoll: number, slotRoll: number): PartDefinition {
  if (!Number.isFinite(tierRoll) || tierRoll < 0 || tierRoll >= 1 || !Number.isFinite(slotRoll) || slotRoll < 0 || slotRoll >= 1) throw new Error('INVALID_PART_ROLL');
  const tier: PartTier = tierRoll < 0.7 ? 'common' : tierRoll < 0.95 ? 'rare' : 'epic';
  const slots: PartSlot[] = ['engine', 'turbo', 'tires', 'ecu'];
  const slot = slots[Math.min(slots.length - 1, Math.floor(slotRoll * slots.length))];
  return partCatalog.find(part => part.tier === tier && part.slot === slot)!;
}
function derivedRoll(value: number, offset: number): number {
  const result = (value * 0.7548776662466927 + offset) % 1;
  return result < 0 ? result + 1 : result;
}
export function openCase(state: GameState, roll: number, partChanceRoll = derivedRoll(roll, 0.173), partTierRoll = derivedRoll(roll, 0.417), partSlotRoll = derivedRoll(roll, 0.731)): GameState {
  if (state.credits < CASE_COST) throw new Error('INSUFFICIENT_CREDITS');
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1 || !Number.isFinite(partChanceRoll) || partChanceRoll < 0 || partChanceRoll >= 1) throw new Error('INVALID_ROLL');
  const tier = roll < 0.7 ? 'common' : roll < 0.95 ? 'rare' : 'epic';
  const prize = starterCars.find(car => car.tier === tier)!;
  const owned = state.cars.find(car => car.id === prize.id)?.owned;
  const refund = owned ? (tier === 'common' ? 80 : tier === 'rare' ? 160 : 220) : 0;
  const droppedPart = partChanceRoll < 0.5 ? getPartDrop(partTierRoll, partSlotRoll) : null;
  const parts = { ...emptyParts(), ...(state.parts ?? {}) };
  if (droppedPart) parts[droppedPart.id] = Math.min(MAX_PROGRESS_COUNTER, (Number.isSafeInteger(parts[droppedPart.id]) && parts[droppedPart.id] >= 0 ? parts[droppedPart.id] : 0) + 1);
  const rewardLabel = droppedPart ? prize.name + ' + ' + droppedPart.name.ru : prize.name;
  return {
    ...state,
    credits: state.credits - CASE_COST + refund,
    cars: state.cars.map(car => car.id === prize.id ? { ...car, owned: true } : car),
    parts,
    installedParts: state.installedParts ?? emptyInstalled(),
    history: [rewardLabel + (owned ? ' (+credits)' : ''), ...state.history].slice(0, 20),
    casesOpened: Math.min(MAX_PROGRESS_COUNTER, (Number.isSafeInteger(state.casesOpened) && state.casesOpened >= 0 ? state.casesOpened : 0) + 1)
  };
}
export function getCarStats(state: GameState, carId: string): { power: number; handling: number } {
  const car = state.cars.find(item => item.id === carId);
  if (!car) throw new Error('NO_CAR');
  let power = car.power;
  let handling = car.handling;
  const installed = state.installedParts?.[carId] ?? {};
  for (const partId of Object.values(installed)) {
    const part = partCatalog.find(item => item.id === partId);
    if (part) { power += part.power; handling += part.handling; }
  }
  return { power, handling: Math.min(100, handling) };
}
export function installPart(state: GameState, slot: PartSlot, partId: string): GameState {
  if (!(['engine', 'turbo', 'tires', 'ecu'] as string[]).includes(slot)) throw new Error('INVALID_PART_SLOT');
  const part = partCatalog.find(item => item.id === partId && item.slot === slot);
  if (!part) throw new Error('INVALID_PART');
  const car = state.cars.find(item => item.id === state.selectedCarId && item.owned);
  if (!car) throw new Error('NO_CAR');
  const currentInventory = { ...emptyParts(), ...(state.parts ?? {}) };
  if (!Number.isSafeInteger(currentInventory[partId]) || currentInventory[partId] < 1) throw new Error('PART_NOT_OWNED');
  const installedParts = { ...(state.installedParts ?? emptyInstalled()) };
  const carInstalled = { ...(installedParts[car.id] ?? {}) };
  const previousId = carInstalled[slot];
  currentInventory[partId] -= 1;
  if (previousId) currentInventory[previousId] = Math.min(MAX_PROGRESS_COUNTER, (currentInventory[previousId] ?? 0) + 1);
  carInstalled[slot] = partId;
  installedParts[car.id] = carInstalled;
  return { ...state, parts: currentInventory, installedParts };
}
export function upgrade(state: GameState): GameState {
  if (!Number.isSafeInteger(state.credits) || state.credits < UPGRADE_COST) throw new Error('INSUFFICIENT_CREDITS');
  const selected = state.cars.find(car => car.id === state.selectedCarId && car.owned);
  if (!selected) throw new Error('NO_CAR');
  if (!Number.isSafeInteger(selected.power) || selected.power < 0 || selected.power > 10000 || selected.power > 9990) throw new Error('MAX_UPGRADE');
  return { ...state, credits: state.credits - UPGRADE_COST, cars: state.cars.map(car => car.id === selected.id ? { ...car, power: car.power + 10 } : car), upgradesPurchased: Math.min(MAX_PROGRESS_COUNTER, (Number.isSafeInteger(state.upgradesPurchased) && state.upgradesPurchased >= 0 ? state.upgradesPurchased : 0) + 1) };
}
export function race(state: GameState, roll: number): { state: GameState; won: boolean } {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('INVALID_ROLL');
  const car = state.cars.find(item => item.id === state.selectedCarId && item.owned);
  if (!car) throw new Error('NO_CAR');
  const stats = getCarStats(state, car.id);
  const won = stats.power + stats.handling * 0.4 + roll * 60 >= 155;
  const currentCredits = Number.isSafeInteger(state.credits) && state.credits >= 0 ? state.credits : 0;
  const currentXp = Number.isSafeInteger(state.xp) && state.xp >= 0 ? Math.min(state.xp, MAX_XP) : 0;
  const xp = Math.min(MAX_XP, currentXp + (won ? 25 : 10));
  return { won, state: { ...state, credits: Math.min(MAX_CREDITS, currentCredits + (won ? 180 : 50)), level: 1 + Math.floor(xp / 100), xp, history: [(won ? 'WIN ' : 'LOSS ') + car.name, ...state.history].slice(0, 20), racesWon: Math.min(MAX_PROGRESS_COUNTER, (Number.isSafeInteger(state.racesWon) && state.racesWon >= 0 ? state.racesWon : 0) + (won ? 1 : 0)) } };
}
export function safeLoad(raw: string | null): GameState {
  if (!raw) return initialState();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return initialState();
    const s = value as Partial<GameState>;
    if (!Number.isSafeInteger(s.credits) || s.credits! < 0 || !Array.isArray(s.cars) || !Array.isArray(s.history) || (s.language !== 'ru' && s.language !== 'uk')) return initialState();
    const cars = starterCars.map(car => {
      const saved = s.cars!.find(c => c?.id === car.id);
      const validPower = Number.isSafeInteger(saved?.power) && saved!.power >= car.power && saved!.power <= 10000;
      return { ...car, owned: car.owned || saved?.owned === true, power: validPower ? saved!.power : car.power };
    });
    const selectedCarId = cars.some(c => c.id === s.selectedCarId && c.owned) ? s.selectedCarId! : 'comet';
    const xp = Number.isSafeInteger(s.xp) && s.xp! >= 0 && s.xp! <= MAX_XP ? s.xp! : 0;
    const parts = emptyParts();
    if (s.parts && typeof s.parts === 'object') for (const part of partCatalog) {
      const count = (s.parts as Record<string, unknown>)[part.id];
      parts[part.id] = Number.isSafeInteger(count) && (count as number) >= 0 && (count as number) <= MAX_PROGRESS_COUNTER ? count as number : 0;
    }
    const installedParts = emptyInstalled();
    if (s.installedParts && typeof s.installedParts === 'object') for (const car of cars) {
      const savedSlots = (s.installedParts as Record<string, unknown>)[car.id];
      if (!savedSlots || typeof savedSlots !== 'object') continue;
      for (const slot of ['engine', 'turbo', 'tires', 'ecu'] as PartSlot[]) {
        const id = (savedSlots as Record<string, unknown>)[slot];
        if (typeof id === 'string' && partCatalog.some(part => part.id === id && part.slot === slot)) installedParts[car.id][slot] = id;
      }
    }
    const appearance = Object.fromEntries(starterCars.map(car => { const saved = s.appearance && typeof s.appearance === 'object' ? (s.appearance as Record<string, unknown>)[car.id] : null; const a = saved && typeof saved === 'object' ? saved as Record<string, unknown> : {}; const allowed = (v: unknown, list: string[], fallback: string) => typeof v === 'string' && list.includes(v) ? v : fallback; return [car.id, { body: allowed(a.body, ['factory','crimson','blue','violet','gold'], 'factory'), neon: allowed(a.neon, ['mint','blue','pink','amber'], 'mint'), bodyKit: allowed(a.bodyKit, ['street','wide','track'], 'street') }]; }));
    const level = 1 + Math.floor(xp / 100);
    return {
      appearance, credits: s.credits!, level, xp, language: s.language!, cars, selectedCarId,
      history: s.history.filter((item): item is string => typeof item === 'string').slice(0, 20),
      casesOpened: Number.isSafeInteger(s.casesOpened) && s.casesOpened! >= 0 && s.casesOpened! <= MAX_PROGRESS_COUNTER ? s.casesOpened! : 0,
      racesWon: Number.isSafeInteger(s.racesWon) && s.racesWon! >= 0 && s.racesWon! <= MAX_PROGRESS_COUNTER ? s.racesWon! : 0,
      upgradesPurchased: Number.isSafeInteger(s.upgradesPurchased) && s.upgradesPurchased! >= 0 && s.upgradesPurchased! <= MAX_PROGRESS_COUNTER ? s.upgradesPurchased! : 0,
      parts, installedParts
    };
  } catch { return initialState(); }
}
