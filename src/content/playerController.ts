import { Settings } from "../shared/storage";

type Logger = (message: string, data?: unknown) => void;

type ActiveChangeHandler = (video: HTMLVideoElement | null) => void;
type VolumeChangeHandler = (volume: number, muted: boolean) => void;

type VideoCleanup = () => void;

export class PlayerController {
  private settings: Settings;
  private log: Logger;
  private videos = new Map<HTMLVideoElement, VideoCleanup>();
  private observer: MutationObserver | null = null;
  private activeVideo: HTMLVideoElement | null = null;
  private isMuted = false;
  private onActiveChangeHandlers = new Set<ActiveChangeHandler>();
  private onVolumeChangeHandlers = new Set<VolumeChangeHandler>();

  constructor(settings: Settings, log: Logger) {
    this.settings = settings;
    this.log = log;
  }

  init(): void {
    this.scanForVideos(document.body);
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.scanForVideos(node);
          }
        });
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.cleanupVideos(node);
          }
        });
      }
    });

    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    document.addEventListener("keydown", this.handleKeydown, true);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.videos.forEach((cleanup) => cleanup());
    this.videos.clear();
    document.removeEventListener("keydown", this.handleKeydown, true);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.applySettingsToVideos();
  }

  onActiveChange(handler: ActiveChangeHandler): void {
    this.onActiveChangeHandlers.add(handler);
  }

  onVolumeChange(handler: VolumeChangeHandler): void {
    this.onVolumeChangeHandlers.add(handler);
  }

  getActiveVideo(): HTMLVideoElement | null {
    return this.activeVideo;
  }

  setActiveVideo(video: HTMLVideoElement | null): void {
    if (video === this.activeVideo) {
      return;
    }
    this.activeVideo = video;
    this.onActiveChangeHandlers.forEach((handler) => handler(video));
  }

  setVolume(percent: number): void {
    const volume = Math.min(100, Math.max(0, percent));
    this.settings.volume = volume;
    this.isMuted = false;
    this.applyVolume(volume);
    this.onVolumeChangeHandlers.forEach((handler) =>
      handler(volume, this.isMuted)
    );
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyVolume(this.settings.volume);
    this.onVolumeChangeHandlers.forEach((handler) =>
      handler(this.settings.volume, this.isMuted)
    );
    return this.isMuted;
  }

  getVolume(): number {
    return this.settings.volume;
  }

  seekBy(seconds: number): void {
    const target = this.getPrimaryTarget();
    if (!target || Number.isNaN(target.duration)) {
      return;
    }
    const next = Math.min(
      Math.max(0, target.currentTime + seconds),
      target.duration || target.currentTime + seconds
    );
    target.currentTime = next;
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      return;
    }
    this.applySettingsToVideos();
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.target instanceof HTMLElement) {
      const tag = event.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || event.target.isContentEditable) {
        return;
      }
    }

    const step = this.settings.seekStep;

    if (event.shiftKey && event.code === "ArrowUp") {
      this.setVolume(this.settings.volume + 5);
      event.preventDefault();
      return;
    }
    if (event.shiftKey && event.code === "ArrowDown") {
      this.setVolume(this.settings.volume - 5);
      event.preventDefault();
      return;
    }
    if (event.shiftKey && event.code === "KeyM") {
      this.toggleMute();
      event.preventDefault();
      return;
    }

    if (event.code === "ArrowLeft") {
      const multiplier = event.shiftKey ? -3 : -1;
      this.seekBy(step * multiplier);
      event.preventDefault();
      return;
    }
    if (event.code === "ArrowRight") {
      const multiplier = event.shiftKey ? 3 : 1;
      this.seekBy(step * multiplier);
      event.preventDefault();
    }
  };

  private scanForVideos(root: ParentNode): void {
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
    videos.forEach((video) => this.registerVideo(video));

    if (root instanceof HTMLVideoElement) {
      this.registerVideo(root);
    }
  }

  private registerVideo(video: HTMLVideoElement): void {
    if (this.videos.has(video)) {
      return;
    }

    this.log("Video detected", video);

    const onPlay = () => {
      this.setActiveVideo(video);
      if (this.settings.singleActiveVideo) {
        this.pauseOtherVideos(video);
      }
    };

    const onPointerDown = () => {
      this.setActiveVideo(video);
    };

    const onWheel = (event: WheelEvent) => {
      if (!this.settings.enableWheelSeek) {
        return;
      }
      if (event.deltaY === 0) {
        return;
      }
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      this.seekBy(this.settings.seekStep * direction);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pointerdown", onPointerDown);
    video.addEventListener("wheel", onWheel, { passive: false });

    if (this.settings.disableHoverAutoplay) {
      const stopHoverAutoplay = (event: Event) => {
        event.stopImmediatePropagation();
      };
      video.addEventListener("mouseenter", stopHoverAutoplay, true);
      video.addEventListener("mouseover", stopHoverAutoplay, true);
      this.videos.set(video, () => {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pointerdown", onPointerDown);
        video.removeEventListener("wheel", onWheel);
        video.removeEventListener("mouseenter", stopHoverAutoplay, true);
        video.removeEventListener("mouseover", stopHoverAutoplay, true);
      });
    } else {
      this.videos.set(video, () => {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pointerdown", onPointerDown);
        video.removeEventListener("wheel", onWheel);
      });
    }

    this.applySettingsToVideo(video);
  }

  private cleanupVideos(root: ParentNode): void {
    if (root instanceof HTMLVideoElement) {
      this.removeVideo(root);
      return;
    }
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video"));
    videos.forEach((video) => this.removeVideo(video));
  }

  private removeVideo(video: HTMLVideoElement): void {
    const cleanup = this.videos.get(video);
    if (cleanup) {
      cleanup();
      this.videos.delete(video);
      if (this.activeVideo === video) {
        this.setActiveVideo(null);
      }
    }
  }

  private applySettingsToVideos(): void {
    this.videos.forEach((_cleanup, video) => this.applySettingsToVideo(video));
  }

  private applySettingsToVideo(video: HTMLVideoElement): void {
    if (this.settings.lagReductionMode) {
      video.preload = "auto";
      video.playsInline = true;
    }

    if (this.settings.applyToAllVideos || video === this.activeVideo) {
      this.applyVolume(this.settings.volume, video);
    }
  }

  private applyVolume(volume: number, target?: HTMLVideoElement): void {
    const desiredVolume = volume / 100;
    const targets = target
      ? [target]
      : this.settings.applyToAllVideos
        ? Array.from(this.videos.keys())
        : this.activeVideo
          ? [this.activeVideo]
          : [];

    targets.forEach((video) => {
      video.volume = desiredVolume;
      video.muted = this.isMuted;
    });
  }

  private pauseOtherVideos(current: HTMLVideoElement): void {
    this.videos.forEach((_cleanup, video) => {
      if (video !== current && !video.paused) {
        video.pause();
      }
    });
  }

  private getPrimaryTarget(): HTMLVideoElement | null {
    return this.activeVideo || Array.from(this.videos.keys())[0] || null;
  }
}
