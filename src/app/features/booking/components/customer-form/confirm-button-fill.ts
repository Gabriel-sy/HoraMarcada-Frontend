export type ConfirmFillPhase = 'idle' | 'filling' | 'success';

const FILL_MIN_MS = 1200;
const HOLD_RATIO = 0.92;
const FINISH_MIN_MS = 220;
const CHECKMARK_HOLD_MS = 700;

export class ConfirmButtonFillController {
  onProgress?: (percent: number) => void;
  onPhaseChange?: (phase: ConfirmFillPhase) => void;
  onReady?: () => void;

  private startMs = 0;
  private rafId: number | null = null;
  private checkmarkTimeout: ReturnType<typeof setTimeout> | null = null;
  private apiSucceeded = false;
  private finishStarted = false;
  private finishStartMs = 0;
  private finishFrom = 0;
  private finishDurationMs = FINISH_MIN_MS;

  start(): void {
    this.clearTimers();
    this.apiSucceeded = false;
    this.finishStarted = false;
    this.startMs = performance.now();
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
    this.onProgress?.(0);
    this.onPhaseChange?.('idle');
  }

  destroy(): void {
    this.clearTimers();
  }

  private scheduleTick(): void {
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private tick(): void {
    const elapsed = performance.now() - this.startMs;

    if (!this.apiSucceeded) {
      const progress = Math.min(HOLD_RATIO, (elapsed / FILL_MIN_MS) * HOLD_RATIO);
      this.onProgress?.(progress * 100);
      this.scheduleTick();
      return;
    }

    if (!this.finishStarted) {
      this.finishStarted = true;
      this.finishStartMs = performance.now();
      this.finishFrom = Math.min(HOLD_RATIO, (elapsed / FILL_MIN_MS) * HOLD_RATIO);
      this.finishDurationMs = Math.max(FILL_MIN_MS - elapsed, FINISH_MIN_MS);
    }

    const finishElapsed = performance.now() - this.finishStartMs;
    const t = Math.min(1, finishElapsed / this.finishDurationMs);
    const progress = this.finishFrom + (1 - this.finishFrom) * t;
    this.onProgress?.(progress * 100);

    if (t >= 1) {
      this.rafId = null;
      this.onPhaseChange?.('success');
      this.checkmarkTimeout = setTimeout(() => this.onReady?.(), CHECKMARK_HOLD_MS);
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
