import { Settings } from "../shared/storage";
import { PlayerController } from "./playerController";

type Logger = (message: string, data?: unknown) => void;

const DIRECT_PATH = "/direct";

export class DirectNavigator {
  private controller: PlayerController;
  private settings: Settings;
  private log: Logger;

  constructor(controller: PlayerController, settings: Settings, log: Logger) {
    this.controller = controller;
    this.settings = settings;
    this.log = log;
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  isAvailable(): boolean {
    return window.location.pathname.startsWith(DIRECT_PATH);
  }

  next(): void {
    if (!this.settings.enableDirectNav || !this.isAvailable()) {
      return;
    }
    if (this.tryNativeControls("next")) {
      return;
    }
    this.navigateByMessage(1);
  }

  prev(): void {
    if (!this.settings.enableDirectNav || !this.isAvailable()) {
      return;
    }
    if (this.tryNativeControls("prev")) {
      return;
    }
    this.navigateByMessage(-1);
  }

  private navigateByMessage(direction: number): void {
    const items = this.findVideoItems();
    if (!items.length) {
      this.log("Direct: no video items found");
      return;
    }
    const active = this.controller.getActiveVideo();
    const currentItem = active
      ? items.find((item) => item.contains(active))
      : null;
    const index = currentItem ? items.indexOf(currentItem) : -1;
    const nextIndex = index + direction;

    if (nextIndex >= 0 && nextIndex < items.length) {
      items[nextIndex].click();
      return;
    }

    const list = this.findMessageList();
    if (list && currentItem) {
      currentItem.scrollIntoView({ block: "center" });
      window.setTimeout(() => {
        const refreshed = this.findVideoItems();
        const refreshedIndex = refreshed.indexOf(currentItem);
        const candidate = refreshed[refreshedIndex + direction];
        candidate?.click();
      }, 300);
    }
  }

  private findMessageList(): HTMLElement | null {
    return (
      document.querySelector<HTMLElement>("div[role='list']") ||
      document.querySelector<HTMLElement>("main")
    );
  }

  private findVideoItems(): HTMLElement[] {
    const scope = this.findMessageList() || document.body;
    const candidates = Array.from(
      scope.querySelectorAll<HTMLElement>("a, button, [role='button']")
    );

    const filtered = candidates.filter((candidate) => {
      if (candidate.querySelector("video")) {
        return true;
      }
      const img = candidate.querySelector("img");
      if (img?.alt?.toLowerCase().includes("video")) {
        return true;
      }
      const label = candidate.getAttribute("aria-label")?.toLowerCase();
      if (label?.includes("video")) {
        return true;
      }
      return false;
    });

    return filtered;
  }

  private tryNativeControls(direction: "next" | "prev"): boolean {
    const labels =
      direction === "next"
        ? ["next", "следующее", "далее"]
        : ["previous", "prev", "предыдущее", "назад"];

    const button = Array.from(
      document.querySelectorAll<HTMLElement>("button, [role='button']")
    ).find((element) => {
      const label =
        element.getAttribute("aria-label")?.toLowerCase() ||
        element.textContent?.toLowerCase() ||
        "";
      return labels.some((token) => label.includes(token));
    });

    if (button) {
      button.click();
      return true;
    }

    return false;
  }
}
