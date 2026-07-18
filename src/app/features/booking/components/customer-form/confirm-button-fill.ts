import { getSuccessOverlayTiming } from '../../success-overlay-timing';

export type ConfirmFillPhase = 'idle' | 'filling' | 'success';

const FILL_BASE_MS = 3200;
const HOLD_RATIO = 0.92;
const FINISH_MIN_MS = 320;
const NORMAL_SPEED = 1;
const SLOW_SPEED_MIN = 0.18;
const SLOW_SPEED_MAX = 0.35;
const SEGMENT_MIN = 0.08;
const SEGMENT_MAX = 0.2;

export class ConfirmButtonFillController {
  onProgress?: (percent: number) => void;
  onPhaseChange?: (phase: ConfirmFillPhase) => void;
  onReady?: () => void;

  private lastMs = 0;
  private rafId: number | null = null;
  private checkmarkTimeout: ReturnType<typeof setTimeout> | null = null;
  private apiSucceeded = false;
  private displayedProgress = 0;
  private speed = NORMAL_SPEED;
  private segmentEndsAt = 0;
  private finishStarted = false;
  private finishStartMs = 0;
  private finishFrom = 0;
  private finishDurationMs = FINISH_MIN_MS;

  start(): void {
    this.clearTimers();
    this.apiSucceeded = false;
    this.finishStarted = false;
    this.displayedProgress = 0;
    this.speed = NORMAL_SPEED;
    this.lastMs = performance.now();
    this.armNextSegment(false);
    this.onPhaseChange?.('filling');
    this.onProgress?.(0);
    this.scheduleTick();
  }

  markSucceeded(): void {
    this.apiSucceeded = true;
  }

  fail(): void {
    this.clearTimers();
    this.apiSucceeded = false;
    this.finishStarted = false;
    this.displayedProgress = 0;
    this.onProgress?.(0);
    this.onPhaseChange?.('idle');
  }

  destroy(): void {
    this.clearTimers();
  }

  private armNextSegment(preferSlow: boolean): void {
    const segment = SEGMENT_MIN + Math.random() * (SEGMENT_MAX - SEGMENT_MIN);
    this.segmentEndsAt = Math.min(HOLD_RATIO - 0.01, this.displayedProgress + segment);

    if (preferSlow) {
      this.speed = SLOW_SPEED_MIN + Math.random() * (SLOW_SPEED_MAX - SLOW_SPEED_MIN);
    } else {
      this.speed = NORMAL_SPEED;
    }
  }

  private scheduleTick(): void {
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private tick(): void {
    const now = performance.now();
    const dt = now - this.lastMs;
    this.lastMs = now;

    if (!this.apiSucceeded) {
      const rate = (HOLD_RATIO / FILL_BASE_MS) * this.speed;
      this.displayedProgress = Math.min(HOLD_RATIO, this.displayedProgress + dt * rate);

      if (
        this.displayedProgress >= this.segmentEndsAt &&
        this.displayedProgress < HOLD_RATIO - 0.01
      ) {
        this.armNextSegment(this.speed === NORMAL_SPEED);
      }

      this.onProgress?.(this.displayedProgress * 100);
      this.scheduleTick();
      return;
    }

    if (!this.finishStarted) {
      this.finishStarted = true;
      this.finishStartMs = now;
      this.finishFrom = this.displayedProgress;
      this.finishDurationMs = Math.max(FINISH_MIN_MS, (1 - this.finishFrom) * 1100);
    }

    const finishElapsed = now - this.finishStartMs;
    const t = Math.min(1, finishElapsed / this.finishDurationMs);
    this.displayedProgress = this.finishFrom + (1 - this.finishFrom) * t;
    this.onProgress?.(this.displayedProgress * 100);

    if (t >= 1) {
      this.rafId = null;
      this.onPhaseChange?.('success');
      this.checkmarkTimeout = setTimeout(
        () => this.onReady?.(),
        getSuccessOverlayTiming().buttonHoldMs
      );
      return;
    }

    this.scheduleTick();
  }

  private clearTimers(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.checkmarkTimeout != null) {
      clearTimeout(this.checkmarkTimeout);
      this.checkmarkTimeout = null;
    }
  }
}
