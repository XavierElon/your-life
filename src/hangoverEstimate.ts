/** Typical mean month length used to convert downtime days ↔ month-dots */
export const AVG_DAYS_PER_MONTH = 30.437

export type HangoverInputs = {
  drinkingDaysPerMonth: number
  /** Expected calendar-days impaired per drinking day on average (combines odds + severity). */
  avgDaysLostPerDrinkDay: number
}

export type HangoverMetrics = {
  /** Expected downtime days averaged per chronological month at this cadence */
  expectedLostDaysPerCalendarMonth: number
  /** If rate held through every remaining dot in the 90y grid (~1 dot ≈ one month bucket) */
  projectedLostDaysAcrossRemainingDots: number
  equivalentDotMonthsAcrossRemaining: number
  /** Same steady rate across the entire 1080-dot grid lifespan */
  projectedLostDaysAcrossFullGrid: number
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

export function computeHangoverMetrics(
  raw: HangoverInputs,
  remainingDots: number,
  totalDots: number,
): HangoverMetrics {
  const d = clamp(raw.drinkingDaysPerMonth, 0, 31)
  const L = clamp(raw.avgDaysLostPerDrinkDay, 0, 14)

  const perMonth = d * L
  const remaining = clamp(remainingDots, 0, 1e6)
  const total = clamp(totalDots, 0, 1e6)

  return {
    expectedLostDaysPerCalendarMonth: perMonth,
    projectedLostDaysAcrossRemainingDots: perMonth * remaining,
    equivalentDotMonthsAcrossRemaining:
      AVG_DAYS_PER_MONTH > 0 ? (perMonth * remaining) / AVG_DAYS_PER_MONTH : 0,
    projectedLostDaysAcrossFullGrid: perMonth * total,
  }
}

/** Grid + legend cohort when drinking model paints tail dots */
export const HANGOVER_TOPIC = {
  key: 'hangover',
  label: 'Hangover downtime (estimate)',
  color: '#fb7185',
} as const

export type HangoverPaint = {
  active: boolean
  dotCount: number
}

export function hangoverDotsFromMetrics(
  equivalentMonthDots: number,
  remainingDots: number,
): number {
  if (remainingDots <= 0) return 0
  const n = Math.round(equivalentMonthDots)
  return clamp(n, 0, remainingDots)
}
