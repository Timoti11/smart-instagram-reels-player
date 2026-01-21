import { Settings } from "../shared/storage";
import { PlayerController } from "./playerController";
import { DirectNavigator } from "./directNavigator";

export class UIOverlay {
  private controller: PlayerController;
  private directNavigator: DirectNavigator;
  private settings: Settings;
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private panel: HTMLDivElement;
  private volumeSlider: HTMLInputElement;
  private volumeValue: HTMLSpanElement;
  private muteButton: HTMLButtonElement;
  private toast: HTMLDivElement;
  private hideTimeout: number | null = null;

  constructor(
    controller: PlayerController,
    directNavigator: DirectNavigator,
    settings: Settings
  ) {
    this.controller = controller;
    this.directNavigator = directNavigator;
    this.settings = settings;

    this.host = document.createElement("div");
    this.host.style.position = "fixed";
    this.host.style.top = "0";
    this.host.style.left = "0";
    this.host.style.zIndex = "99999";
    this.host.style.pointerEvents = "none";
    this.host.style.opacity = "0";
    this.host.style.transition = "opacity 150ms ease";

    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = this.getTemplate();

    const panel = this.shadow.querySelector<HTMLDivElement>(".panel");
    const slider = this.shadow.querySelector<HTMLInputElement>("#ig-volume");
    const value = this.shadow.querySelector<HTMLSpanElement>("#ig-volume-value");
    const mute = this.shadow.querySelector<HTMLButtonElement>("#ig-mute");
    const toast = this.shadow.querySelector<HTMLDivElement>(".toast");

    if (!panel || !slider || !value || !mute || !toast) {
      throw new Error("Overlay template missing required elements");
    }

    this.panel = panel;
    this.volumeSlider = slider;
    this.volumeValue = value;
    this.muteButton = mute;
    this.toast = toast;
  }

  init(): void {
    document.body.appendChild(this.host);
    this.volumeSlider.value = String(this.settings.volume);
    this.volumeValue.textContent = `${this.settings.volume}%`;

    this.volumeSlider.addEventListener("input", this.onVolumeInput);
    this.muteButton.addEventListener("click", this.onMuteClick);

    const minus = this.shadow.querySelector<HTMLButtonElement>("#ig-seek-back");
    const plus = this.shadow.querySelector<HTMLButtonElement>("#ig-seek-forward");
    if (minus) {
      minus.addEventListener("click", () => {
        this.controller.seekBy(-this.settings.seekStep);
        this.show();
      });
    }
    if (plus) {
      plus.addEventListener("click", () => {
        this.controller.seekBy(this.settings.seekStep);
        this.show();
      });
    }

    const prev = this.shadow.querySelector<HTMLButtonElement>("#ig-direct-prev");
    const next = this.shadow.querySelector<HTMLButtonElement>("#ig-direct-next");
    if (prev) {
      prev.addEventListener("click", () => {
        this.directNavigator.prev();
        this.show();
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        this.directNavigator.next();
        this.show();
      });
    }

    document.addEventListener("mousemove", this.onMouseMove, { passive: true });
    document.addEventListener("keydown", this.onKeydown, true);
    window.addEventListener("scroll", this.updatePosition, true);
    window.addEventListener("resize", this.updatePosition, true);

    this.controller.onActiveChange((video) => {
      this.updatePosition();
      if (video) {
        this.show();
      }
    });

    this.updateDirectControls();
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.volumeSlider.value = String(settings.volume);
    this.volumeValue.textContent = `${settings.volume}%`;
    const back = this.shadow.querySelector<HTMLButtonElement>("#ig-seek-back");
    const forward = this.shadow.querySelector<HTMLButtonElement>(
      "#ig-seek-forward"
    );
    if (back) {
      back.textContent = `-${settings.seekStep}s`;
    }
    if (forward) {
      forward.textContent = `+${settings.seekStep}s`;
    }
    this.updateDirectControls();
  }

  showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add("show");
    window.setTimeout(() => {
      this.toast.classList.remove("show");
    }, 1200);
  }

  updateVolume(volume: number, muted: boolean, announce = false): void {
    this.volumeSlider.value = String(volume);
    this.volumeValue.textContent = `${volume}%`;
    this.muteButton.textContent = muted ? "Unmute" : "Mute";
    if (announce) {
      this.showToast(muted ? "Muted" : `Volume ${volume}%`);
      this.show();
    }
  }

  private onVolumeInput = (): void => {
    const value = Number(this.volumeSlider.value);
    this.volumeValue.textContent = `${value}%`;
    this.controller.setVolume(value);
    this.show();
  };

  private onMuteClick = (): void => {
    const muted = this.controller.toggleMute();
    this.muteButton.textContent = muted ? "Unmute" : "Mute";
    this.show();
  };

  private onMouseMove = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const video = target.closest("video");
    if (video instanceof HTMLVideoElement) {
      this.controller.setActiveVideo(video);
      this.show();
    }
  };

  private onKeydown = (): void => {
    this.show();
  };

  private show(): void {
    this.updatePosition();
    this.updateDirectControls();
    this.host.style.opacity = "1";
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = window.setTimeout(() => {
      this.host.style.opacity = "0";
    }, 2000);
  }

  private updateDirectControls(): void {
    const controls = this.shadow.querySelector<HTMLDivElement>(".direct-controls");
    if (!controls) {
      return;
    }
    controls.style.display =
      this.settings.enableDirectNav && this.directNavigator.isAvailable()
        ? "flex"
        : "none";
  }

  private updatePosition = (): void => {
    const video = this.controller.getActiveVideo();
    if (!video) {
      return;
    }
    const rect = video.getBoundingClientRect();
    const width = Math.max(200, rect.width);
    const left = rect.left + rect.width - width - 12;
    const top = rect.top + 12;
    this.panel.style.width = `${width}px`;
    this.panel.style.transform = `translate(${Math.max(12, left)}px, ${Math.max(
      12,
      top
    )}px)`;
    this.host.style.pointerEvents = "auto";
  };

  private getTemplate(): string {
    return `
      <style>
        :host {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .panel {
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
          pointer-events: auto;
        }
        .group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .label {
          font-size: 12px;
          opacity: 0.8;
          min-width: 40px;
        }
        input[type="range"] {
          accent-color: #fff;
          width: 120px;
        }
        button {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
        }
        button:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          opacity: 0;
          transition: opacity 150ms ease;
          pointer-events: none;
        }
        .toast.show {
          opacity: 1;
        }
        .direct-controls {
          display: flex;
          gap: 6px;
        }
      </style>
      <div class="panel">
        <div class="group">
          <span class="label">Vol</span>
          <input id="ig-volume" type="range" min="0" max="100" value="70" />
          <span id="ig-volume-value">70%</span>
          <button id="ig-mute">Mute</button>
        </div>
        <div class="group">
          <button id="ig-seek-back">-${this.settings.seekStep}s</button>
          <button id="ig-seek-forward">+${this.settings.seekStep}s</button>
        </div>
        <div class="group direct-controls">
          <button id="ig-direct-prev">Prev</button>
          <button id="ig-direct-next">Next</button>
        </div>
      </div>
      <div class="toast"></div>
    `;
  }
}
