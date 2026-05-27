import type { ActivitySplit } from './activities'

export const WEEKLY_TOPIC_SOCIAL_KEY = 'social'
export const WEEKLY_TOPIC_TV_KEY = 'tv'

export const WEEKLY_TOPIC_SOCIAL_COLOR = '#ec4899'
export const WEEKLY_TOPIC_TV_COLOR = '#0284c7'

/** Max hours/week per hobby for numeric inputs */
export const WEEKLY_TOPIC_MAX_HOURS = 168

export type WeeklyTopicLabels = {
  socialLabel?: string
  tvLabel?: string
}

/**
 * Append social + TV/weekend-screen hobbies as fractional shares of modeled time,
 * proportional to weekly hours versus the scaled baseline split.
 *
 * Hours are treated like extra weight on top of `(fraction × scale)` units for
 * each row in `base`. Renormalizes so fractions sum to 1. With both hours at 0,
 * base fractions stay identical to `base`.
 */
export function mergeActivitiesWithWeeklyTopics(
  base: ActivitySplit[],
  hoursSocialPerWeek: number,
  hoursTvPerWeek: number,
  scale = 100,
  labels?: WeeklyTopicLabels,
): ActivitySplit[] {
  const hSocial = clampHours(hoursSocialPerWeek)
  const hTv = clampHours(hoursTvPerWeek)

  const baseWeights = base.map((a) => a.fraction * scale)
  const allWeights = [...baseWeights, hSocial, hTv]
  const wSum = allWeights.reduce((s, x) => s + x, 0) || 1
  const fractions = allWeights.map((w) => w / wSum)

  const adjustedBase: ActivitySplit[] = base.map((a, i) => ({
    ...a,
    fraction: fractions[i] ?? 0
  }))

  const socialFraction = fractions[base.length] ?? 0
  const tvFraction = fractions[base.length + 1] ?? 0

  const social: ActivitySplit = {
    key: WEEKLY_TOPIC_SOCIAL_KEY,
    label: sanitizeTopicLabel(labels?.socialLabel, 'Social media'),
    fraction: socialFraction,
    color: WEEKLY_TOPIC_SOCIAL_COLOR
  }
  const tv: ActivitySplit = {
    key: WEEKLY_TOPIC_TV_KEY,
    label: sanitizeTopicLabel(labels?.tvLabel, 'Watching TV'),
    fraction: tvFraction,
    color: WEEKLY_TOPIC_TV_COLOR
  }

  return [...adjustedBase, social, tv]
}

function sanitizeTopicLabel(raw: string | undefined, fallback: string): string {
  const s = raw?.trim()
  if (!s) return fallback
  return s.slice(0, 56)
}

function clampHours(n: number): number {
  if (typeof n === 'number' && Number.isFinite(n)) {
    return Math.min(WEEKLY_TOPIC_MAX_HOURS, Math.max(0, n))
  }
  return 0
}
