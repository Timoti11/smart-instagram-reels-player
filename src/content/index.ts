import { getSettings, onSettingsChange, saveSettings } from "../shared/storage";
import { PlayerController } from "./playerController";
import { UIOverlay } from "./uiOverlay";
import { DirectNavigator } from "./directNavigator";

const PREFIX = "[IG-Reels-Helper]";

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
};

const init = async (): Promise<void> => {
  let settings = await getSettings();
  let debugEnabled = settings.debugMode;

  const log = (message: string, data?: unknown): void => {
    if (!debugEnabled) {
      return;
    }
    if (data) {
      console.debug(`${PREFIX} ${message}`, data);
    } else {
      console.debug(`${PREFIX} ${message}`);
    }
  };

  const controller = new PlayerController(settings, log);
  const directNavigator = new DirectNavigator(controller, settings, log);
  const overlay = new UIOverlay(controller, directNavigator, settings);

  controller.init();
  overlay.init();

  controller.onVolumeChange((volume, muted) => {
    overlay.updateVolume(volume, muted, true);
    saveSettings({ volume }).catch(() => {
      log("Failed to save volume");
    });
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }
      if (!settings.enableDirectNav || !directNavigator.isAvailable()) {
        return;
      }
      if (event.altKey && event.code === "ArrowRight") {
        directNavigator.next();
        overlay.showToast("Next video");
        event.preventDefault();
      }
      if (event.altKey && event.code === "ArrowLeft") {
        directNavigator.prev();
        overlay.showToast("Prev video");
        event.preventDefault();
      }
    },
    true
  );

  onSettingsChange((next) => {
    settings = next;
    debugEnabled = settings.debugMode;
    controller.updateSettings(settings);
    directNavigator.updateSettings(settings);
    overlay.updateSettings(settings);
  });
};

void init();
