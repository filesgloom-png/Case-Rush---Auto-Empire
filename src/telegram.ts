/** Minimal Telegram Web App bootstrap. Authentication must be verified by a backend. */
type TelegramWebApp = {
  initData?: string;
  platform?: string;
  version?: string;
  viewportHeight?: number;
  safeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number };
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (eventType: string, eventHandler: (...args: unknown[]) => void) => void;
  offEvent?: (eventType: string, eventHandler: (...args: unknown[]) => void) => void;
};
type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } };

export type TelegramLaunchStatus = {
  available: boolean;
  initDataPresent: boolean;
  platform: string;
  version: string;
};

function applyViewport(webApp: TelegramWebApp): void {
  const root = document.documentElement;
  if (Number.isFinite(webApp.viewportHeight) && (webApp.viewportHeight ?? 0) > 0) {
    root.style.setProperty('--case-rush-viewport-height', `${webApp.viewportHeight}px`);
  }
  const bottom = webApp.safeAreaInset?.bottom;
  if (Number.isFinite(bottom) && (bottom ?? 0) >= 0) {
    root.style.setProperty('--case-rush-safe-bottom', `${bottom}px`);
  }
}

export function initTelegramWebApp(): TelegramLaunchStatus {
  const webApp = (window as TelegramWindow).Telegram?.WebApp;
  if (!webApp) {
    document.documentElement.style.setProperty('--case-rush-viewport-height', '100dvh');
    return { available: false, initDataPresent: false, platform: 'browser', version: '' };
  }

  webApp.ready?.();
  webApp.expand?.();
  webApp.setHeaderColor?.('#0b1017');
  webApp.setBackgroundColor?.('#0b1017');
  applyViewport(webApp);

  const updateViewport = (): void => applyViewport(webApp);
  webApp.onEvent?.('viewportChanged', updateViewport);
  webApp.onEvent?.('safeAreaChanged', updateViewport);
  webApp.onEvent?.('contentSafeAreaChanged', updateViewport);

  return {
    available: true,
    initDataPresent: typeof webApp.initData === 'string' && webApp.initData.length > 0,
    platform: typeof webApp.platform === 'string' ? webApp.platform : 'unknown',
    version: typeof webApp.version === 'string' ? webApp.version : ''
  };
}

/**
 * Raw launch data may be forwarded to a trusted HTTPS backend for verification.
 * Never log it, display it, persist it, or use initDataUnsafe as authentication.
 */
export function getTelegramInitDataForBackend(): string | null {
  const webApp = (window as TelegramWindow).Telegram?.WebApp;
  return typeof webApp?.initData === 'string' && webApp.initData.length > 0
    ? webApp.initData
    : null;
}
