export type SuccessOverlayBreakpoint = 'mobile' | 'desktop';

export type SuccessOverlayTiming = {
  buttonHoldMs: number;
  circleExpandMs: number;
  greenHoldMs: number;
  fadeOutMs: number;
  mountContentMs: number;
  checkPopDelayMs: number;
};

export const SUCCESS_OVERLAY_TIMING = {
  mobileMaxWidth: 768,

  mobile: {
    buttonHoldMs: 400,
    circleExpandMs: 1600,
    greenHoldMs: 400,
    fadeOutMs: 1000,
    mountContentMs: 900,
    checkPopDelayMs: 650,
  } satisfies SuccessOverlayTiming,

  desktop: {
    buttonHoldMs: 450,
    circleExpandMs: 2000,
    greenHoldMs: 250,
    fadeOutMs: 1000,
    mountContentMs: 900,
    checkPopDelayMs: 650,
  } satisfies SuccessOverlayTiming,
} as const;

export function resolveSuccessOverlayBreakpoint(
  width = typeof window !== 'undefined' ? window.innerWidth : SUCCESS_OVERLAY_TIMING.mobileMaxWidth + 1
): SuccessOverlayBreakpoint {
  return width <= SUCCESS_OVERLAY_TIMING.mobileMaxWidth ? 'mobile' : 'desktop';
}

export function getSuccessOverlayTiming(
  breakpoint = resolveSuccessOverlayBreakpoint()
): SuccessOverlayTiming {
  return SUCCESS_OVERLAY_TIMING[breakpoint];
}
