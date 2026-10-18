export type Language = 'ru' | 'uk';
export type Car = { id: string; name: string; tier: 'common' | 'rare' | 'epic'; power: number; handling: number; owned: boolean };
export type GameState = { credits: number; level: number; xp: number; language: Language; cars: Car[]; selectedCarId: string; history: string[] };
export const starterCars: Car[] = [
  { id: 'comet', name: 'Comet S1', tier: 'common', power: 105, handling: 66, owned: true },
  { id: 'vortex', name: 'Vortex GT', tier: 'rare', power: 160, handling: 74, owned: false },
  { id: 'phantom', name: 'Phantom XR', tier: 'epic', power: 230, handling: 82, owned: false }
];
export const CASE_COST = 250;
export function initialState(): GameState {
  return { credits: 1000, level: 1, xp: 0, language: 'ru', cars: starterCars.map(car => ({ ...car })), selectedCarId: 'comet', history: [] };
}
export function openCase(state: GameState, roll: number): GameState {
  if (state.credits < CASE_COST) throw new Error('INSUFFICIENT_CREDITS');
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('INVALID_ROLL');
  const tier = roll < 0.7 ? 'common' : roll < 0.95 ? 'rare' : 'epic';
  const prize = starterCars.find(car => car.tier === tier)!;
  const owned = state.cars.find(car => car.id === prize.id)?.owned;
  const refund = owned ? (tier === 'common' ? 80 : tier === 'rare' ? 180 : 450) : 0;
  return { ...state, credits: state.credits - CASE_COST + refund, cars: state.cars.map(car => car.id === prize.id ? { ...car, owned: true } : car), history: [prize.name + (owned ? ' (+credits)' : ''), ...state.history].slice(0, 20) };
}
export function upgrade(state: GameState): GameState {
  const cost = 300;
  if (state.credits < cost) throw new Error('INSUFFICIENT_CREDITS');
  return { ...state, credits: state.credits - cost, cars: state.cars.map(car => car.id === state.selectedCarId && car.owned ? { ...car, power: car.power + 10 } : car) };
}
export function race(state: GameState, roll: number): { state: GameState; won: boolean } {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('INVALID_ROLL');
  const car = state.cars.find(item => item.id === state.selectedCarId && item.owned);
  if (!car) throw new Error('NO_CAR');
  const won = car.power + car.handling * 0.4 + roll * 60 >= 155;
  const xp = state.xp + (won ? 25 : 10);
  return { won, state: { ...state, credits: state.credits + (won ? 180 : 50), level: 1 + Math.floor(xp / 100), xp, history: [(won ? 'WIN ' : 'LOSS ') + car.name, ...state.history].slice(0, 20) } };
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
      return { ...car, owned: car.owned || saved?.owned === true, power: Number.isInteger(saved?.power) && saved!.power >= car.power && saved!.power <= 10000 ? saved!.power : car.power };
    });
    const selectedCarId = cars.some(c => c.id === s.selectedCarId && c.owned) ? s.selectedCarId! : 'comet';
    return { credits: s.credits!, level: Number.isInteger(s.level) && s.level! > 0 ? s.level! : 1, xp: Number.isInteger(s.xp) && s.xp! >= 0 ? s.xp! : 0, language: s.language!, cars, selectedCarId, history: s.history.filter((x): x is string => typeof x === 'string').slice(0, 20) };
  } catch { return initialState(); }
}
