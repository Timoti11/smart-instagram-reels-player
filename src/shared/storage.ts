export type Settings = {
  volume: number;
  seekStep: number;
  applyToAllVideos: boolean;
  singleActiveVideo: boolean;
  lagReductionMode: boolean;
  enableWheelSeek: boolean;
  enableDirectNav: boolean;
  disableHoverAutoplay: boolean;
  debugMode: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  volume: 70,
  seekStep: 5,
  applyToAllVideos: true,
  singleActiveVideo: true,
  lagReductionMode: true,
  enableWheelSeek: true,
  enableDirectNav: true,
  disableHoverAutoplay: false,
  debugMode: false
};

const SETTINGS_KEY = "settings";

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[SETTINGS_KEY] as Partial<Settings> | undefined)
  };
}

export async function saveSettings(update: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({
    [SETTINGS_KEY]: { ...current, ...update }
  });
}

export function onSettingsChange(
  callback: (settings: Settings) => void
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[SETTINGS_KEY]) {
      return;
    }
    const next = changes[SETTINGS_KEY].newValue as Settings;
    callback({ ...DEFAULT_SETTINGS, ...next });
  });
}
