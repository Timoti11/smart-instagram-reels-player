import { getSettings, saveSettings } from "../shared/storage";

const fields = [
  "volume",
  "seekStep",
  "applyToAllVideos",
  "singleActiveVideo",
  "lagReductionMode",
  "disableHoverAutoplay",
  "enableWheelSeek",
  "enableDirectNav",
  "debugMode"
] as const;

type FieldId = (typeof fields)[number];

const form = document.querySelector<HTMLFormElement>("#settings-form");
const status = document.querySelector<HTMLParagraphElement>("#status");

const getField = (id: FieldId): HTMLInputElement => {
  const element = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!element) {
    throw new Error(`Missing input ${id}`);
  }
  return element;
};

const loadSettings = async (): Promise<void> => {
  const settings = await getSettings();
  getField("volume").value = String(settings.volume);
  getField("seekStep").value = String(settings.seekStep);
  getField("applyToAllVideos").checked = settings.applyToAllVideos;
  getField("singleActiveVideo").checked = settings.singleActiveVideo;
  getField("lagReductionMode").checked = settings.lagReductionMode;
  getField("disableHoverAutoplay").checked = settings.disableHoverAutoplay;
  getField("enableWheelSeek").checked = settings.enableWheelSeek;
  getField("enableDirectNav").checked = settings.enableDirectNav;
  getField("debugMode").checked = settings.debugMode;
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const volume = Number(getField("volume").value);
  const seekStep = Number(getField("seekStep").value);

  await saveSettings({
    volume: Math.min(100, Math.max(0, volume)),
    seekStep: Math.max(1, seekStep),
    applyToAllVideos: getField("applyToAllVideos").checked,
    singleActiveVideo: getField("singleActiveVideo").checked,
    lagReductionMode: getField("lagReductionMode").checked,
    disableHoverAutoplay: getField("disableHoverAutoplay").checked,
    enableWheelSeek: getField("enableWheelSeek").checked,
    enableDirectNav: getField("enableDirectNav").checked,
    debugMode: getField("debugMode").checked
  });

  if (status) {
    status.textContent = "Saved!";
    window.setTimeout(() => {
      status.textContent = "";
    }, 1500);
  }
});

void loadSettings();
