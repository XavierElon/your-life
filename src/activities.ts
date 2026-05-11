export type ActivitySplit = {
  key: string
  label: string
  fraction: number
  color: string
}

/** Rough default share of time across a typical month (sum → normalized to 1) */
const RAW_SPLITS: Array<
  Omit<ActivitySplit, 'fraction'> & { fraction: number }
> = [
  {
    key: 'sleep',
    label: 'Sleeping',
    fraction: 32,
    color: '#4f46e5',
  },
  {
    key: 'work',
    label: 'Work / career',
    fraction: 24,
    color: '#0ea5e9',
  },
  {
    key: 'chores',
    label: 'Chores / errands',
    fraction: 8,
    color: '#f59e0b',
  },
  {
    key: 'fitness',
    label: 'Fitness',
    fraction: 5,
    color: '#22c55e',
  },
  {
    key: 'driving',
    label: 'Driving / commuting',
    fraction: 8,
    color: '#a855f7',
  },
  {
    key: 'other',
    label: 'Other / leisure',
    fraction: 23,
    color: '#64748b',
  },
]

const sum = RAW_SPLITS.reduce((s, row) => s + row.fraction, 0)

export const ACTIVITY_SPLITS: ActivitySplit[] = RAW_SPLITS.map((row) => ({
  ...row,
  fraction: row.fraction / sum,
}))

export function cohortTooltipForActivity(
  activity: ActivitySplit,
  monthsInRun: number,
  remainingMonthsInView: number,
): string {
  const pct =
    remainingMonthsInView > 0
      ? Math.round((monthsInRun / remainingMonthsInView) * 100)
      : 0
  return `${activity.label} — ${monthsInRun.toLocaleString()} upcoming months in this band (~${pct}% of months left in this view)`
}

export function cohortTooltipForLived(totalLivedMonthsInView: number): string {
  return `Past months — time already lived (${totalLivedMonthsInView.toLocaleString()} months in this view)`
}

export function monthAriaSummaryFuture(
  monthLabel: string,
  focus: ActivitySplit,
): string {
  return `${monthLabel}, upcoming. Colored for ${focus.label}, about ${Math.round(focus.fraction * 100)} percent of all upcoming months.`
}

export function monthAriaLived(monthLabel: string): string {
  return `${monthLabel}. Month already lived.`
}
