import type { ActivitySplit } from './activities'

/** Split `n` into integer counts summing to `n`, closest to `fractions` (largest remainder). */
export function allocateCounts(n: number, fractions: number[]): number[] {
  if (n === 0) return fractions.map(() => 0)

  const raw = fractions.map((f) => n * f)
  const floors = raw.map((x) => Math.floor(x))
  const assigned = floors.reduce((a, b) => a + b, 0)
  const leftover = n - assigned

  const byRemainder = raw
    .map((x, i) => ({ i, rem: x - floors[i] }))
    .sort((a, b) => b.rem - a.rem)

  const counts = [...floors]
  for (let k = 0; k < leftover; k++) {
    counts[byRemainder[k].i] += 1
  }

  return counts
}

/**
 * One activity per future month, globally matching activity fractions.
 * Chronological order: first activity’s months run together, then the next, and
 * so on—so the final block sits at the far end of the 90-year window.
 */
export function allocateFutureMonthsSequential(
  activities: ActivitySplit[],
  futureMonthCount: number,
): ActivitySplit[] {
  if (futureMonthCount <= 0) return []

  const fr = activities.map((a) => a.fraction)
  const counts = allocateCounts(futureMonthCount, fr)

  const flat: ActivitySplit[] = []
  for (let i = 0; i < activities.length; i++) {
    const c = counts[i] ?? 0
    for (let j = 0; j < c; j++) {
      flat.push(activities[i]!)
    }
  }

  if (flat.length !== futureMonthCount) {
    throw new Error('allocateFutureMonthsSequential: count mismatch')
  }

  return flat
}
