import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Alert, Badge, Box, Button, ColorSwatch, Container, Group, Modal, Paper, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core'
import { ACTIVITY_SPLITS, type ActivitySplit, cohortTooltipForActivity, cohortTooltipForLived, monthAriaLived, monthAriaSummaryFuture } from './activities'
import { HangoverSection } from './HangoverSection'
import { HANGOVER_TOPIC, type HangoverPaint } from './hangoverEstimate'
import { allocateFutureMonthsSequential } from './futureAllocation'
import {
  WEEKLY_TOPIC_SOCIAL_KEY,
  WEEKLY_TOPIC_TV_KEY,
  mergeActivitiesWithWeeklyTopics
} from './timeBudgetActivities'
import { WeeklyHobbiesSection } from './WeeklyHobbiesSection'
import './App.css'

const EXPECTED_LIFESPAN_YEARS = 90
const TOTAL_MONTHS = EXPECTED_LIFESPAN_YEARS * 12

/** 'lived' = all white dots; otherwise activity `key` */
type CohortHover = 'lived' | (string & {})

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, day] = value.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) {
    return null
  }
  return d
}

function monthStartsFromFirst(birth: Date, count: number): Date[] {
  const start = startOfMonth(birth)
  const y = start.getFullYear()
  const m = start.getMonth()
  return Array.from({ length: count }, (_, i) => new Date(y, m + i, 1))
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

function futureSlotBeforeIndex(months: Date[], gridIndex: number, startOfThisMonth: Date): number {
  return months.slice(0, gridIndex).filter((d) => d.getTime() > startOfThisMonth.getTime()).length
}

/** Grid index matching today’s calendar month, or −1 when “now” sits outside this 90‑year span. */
function indexOfCalendarMonth(months: Date[], cal: Date): number {
  return months.findIndex(
    (d) => d.getFullYear() === cal.getFullYear() && d.getMonth() === cal.getMonth()
  )
}

function monthsInRunSummary(n: number): string {
  if (n <= 0) {
    return 'Under this toy model there are no month-dots labeled with this topic in the horizon yet.'
  }
  if (n === 1) {
    return 'Under this toy model there is roughly 1 month-dot in this topic across the horizon (hangover overlay included when it is enabled).'
  }
  return `Under this toy model there are roughly ${n.toLocaleString()} month-dots in this topic across the horizon (hangover overlay included when it is enabled).`
}

function App() {
  const [birthInput, setBirthInput] = useState('1990-01-01')
  /** From grid dots only; cleared when pointer leaves the month grid */
  const [dotHoverCohort, setDotHoverCohort] = useState<CohortHover | null>(null)
  /** From legend row clicks only; toggle same row to clear */
  const [legendPinCohort, setLegendPinCohort] = useState<CohortHover | null>(null)
  const [hangoverPaint, setHangoverPaint] = useState<HangoverPaint>({
    active: false,
    dotCount: 0
  })
  const [inspectIndex, setInspectIndex] = useState<number | null>(null)
  const [hoursSocialPerWeek, setHoursSocialPerWeek] = useState(0)
  const [hoursTvPerWeek, setHoursTvPerWeek] = useState(0)
  const [weeklySocialLabel, setWeeklySocialLabel] = useState('Social media')
  const [weeklyTvLabel, setWeeklyTvLabel] = useState('Watching TV')

  const scrollElRef = useRef<HTMLDivElement>(null)

  const onHangoverPaintChange = useCallback((p: HangoverPaint) => {
    setHangoverPaint(p)
  }, [])

  /** Dot hover wins over legend pin while the cursor is over the grid */
  const cohortHover = dotHoverCohort ?? legendPinCohort

  const toggleLegendPin = useCallback((key: CohortHover) => {
    setLegendPinCohort((p) => (p === key ? null : key))
  }, [])

  const birth = useMemo(() => {
    const parsed = parseDateInput(birthInput)
    return parsed ?? new Date(1993, 0, 1)
  }, [birthInput])

  const now = new Date()
  const startOfThisMonth = startOfMonth(now)
  const birthInvalidFuture = startOfMonth(birth) > startOfThisMonth

  const totalMonths = TOTAL_MONTHS
  const months = monthStartsFromFirst(birth, TOTAL_MONTHS)

  const livedCount = birthInvalidFuture ? 0 : months.filter((d) => d.getTime() <= startOfThisMonth.getTime()).length
  const remainingCount = Math.max(0, totalMonths - livedCount)
  const maxBirth = now.toISOString().slice(0, 10)

  const hangoverDots = hangoverPaint.active && !birthInvalidFuture ? Math.min(hangoverPaint.dotCount, remainingCount) : 0
  const futureMonthsForSplits = Math.max(0, remainingCount - hangoverDots)

  const mergedActivitySplits = useMemo(
    () =>
      mergeActivitiesWithWeeklyTopics(ACTIVITY_SPLITS, hoursSocialPerWeek, hoursTvPerWeek, 100, {
        socialLabel: weeklySocialLabel,
        tvLabel: weeklyTvLabel
      }),
    [hoursSocialPerWeek, hoursTvPerWeek, weeklySocialLabel, weeklyTvLabel],
  )

  const futureAssignments = useMemo(() => {
    if (birthInvalidFuture) return []
    return allocateFutureMonthsSequential(mergedActivitySplits, futureMonthsForSplits)
  }, [birthInvalidFuture, futureMonthsForSplits, mergedActivitySplits])

  const hangoverTopicSplit: ActivitySplit = useMemo(() => ({ ...HANGOVER_TOPIC, fraction: 0 }), [])

  const futureMonthsPerActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of mergedActivitySplits) {
      map.set(a.key, 0)
    }
    for (const cell of futureAssignments) {
      map.set(cell.key, (map.get(cell.key) ?? 0) + 1)
    }
    if (hangoverDots > 0) {
      map.set(HANGOVER_TOPIC.key, hangoverDots)
    }
    return map
  }, [mergedActivitySplits, futureAssignments, hangoverDots])

  const jumpTargetIndex = useMemo(() => {
    if (birthInvalidFuture) return null
    const ix = indexOfCalendarMonth(months, startOfThisMonth)
    if (ix >= 0) return ix
    if (months[0]?.getTime() > startOfThisMonth.getTime()) return 0
    return TOTAL_MONTHS - 1
  }, [birthInvalidFuture, months, startOfThisMonth])

  const scrollToDotIndex = useCallback((idx: number) => {
    const scope = scrollElRef.current
    if (!scope) return
    const el = scope.querySelector<HTMLElement>(`[data-dot-index="${idx}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const jumpToNow = useCallback(() => {
    if (jumpTargetIndex === null) return
    scrollToDotIndex(jumpTargetIndex)
  }, [jumpTargetIndex, scrollToDotIndex])

  const inspectPayload = useMemo(() => {
    if (inspectIndex === null || birthInvalidFuture || inspectIndex < 0 || inspectIndex >= months.length) {
      return null
    }
    const monthDate = months[inspectIndex]
    const label = formatMonthLabel(monthDate)
    const ordinal = inspectIndex + 1
    const lived = monthDate.getTime() <= startOfThisMonth.getTime()

    if (lived) {
      return {
        label,
        lived: true as const,
        ordinal,
        livedTotal: livedCount
      }
    }

    const slot = futureSlotBeforeIndex(months, inspectIndex, startOfThisMonth)
    const focus: ActivitySplit | null =
      hangoverDots > 0 && slot >= futureMonthsForSplits ? hangoverTopicSplit : futureAssignments[slot] ?? null
    const monthsInRun =
      focus && focus.key === HANGOVER_TOPIC.key ? hangoverDots : focus ? (futureMonthsPerActivity.get(focus.key) ?? 0) : 0

    return {
      label,
      lived: false as const,
      ordinal,
      focus,
      monthsInRun,
      futureOrdinal: slot + 1,
      remainingTotal: remainingCount
    }
  }, [
    inspectIndex,
    birthInvalidFuture,
    months,
    startOfThisMonth,
    livedCount,
    hangoverDots,
    futureMonthsForSplits,
    hangoverTopicSplit,
    futureAssignments,
    futureMonthsPerActivity,
    remainingCount
  ])

  const dimCohort = cohortHover !== null

  function legendRowClass(isHighlighted: boolean): string {
    return ['legend-row', dimCohort && !isHighlighted ? 'legend-row--dim' : '', dimCohort && isHighlighted ? 'legend-row--highlight' : ''].filter(Boolean).join(' ')
  }

  return (
    <Container size="lg" py={{ base: 'md', sm: 'xl' }} px="md">
      <Stack gap="xl">
        <Paper shadow="sm" p={{ base: 'md', sm: 'lg' }} radius="lg" withBorder>
          <Group gap="lg" align="flex-start" justify="space-between" wrap="wrap">
            <Stack gap="sm" style={{ flex: '1 1 18rem', minWidth: 0 }} maw={{ base: '100%', sm: 620 }}>
              <Title order={1} size="h2" fw={700} lts="-0.02em">
                Your life in months
              </Title>
              <Text c="dimmed" size="sm">
                One dot · one calendar month over a 90-year span. Click a dot for details · hover or use the legend to spotlight a cohort. Optional hangover model adds rose dots at the end of the timeline.
              </Text>
              <TextInput
                label="Birth date"
                description="Starts at the first day of that month."
                type="date"
                max={maxBirth}
                value={birthInput}
                onChange={(e) => setBirthInput(e.currentTarget.value)}
                maw={320}
              />
              <HangoverSection remainingDots={remainingCount} totalDots={totalMonths} timelineDisabled={birthInvalidFuture} onPaintChange={onHangoverPaintChange} />
              <WeeklyHobbiesSection
                timelineDisabled={birthInvalidFuture}
                horizonMonthsAhead={birthInvalidFuture ? 0 : remainingCount}
                allocationSlotsAmongHorizon={birthInvalidFuture ? 0 : futureMonthsForSplits}
                hangoverDotsTakingHorizonTail={birthInvalidFuture ? 0 : hangoverDots}
                hoursSocialPerWeek={hoursSocialPerWeek}
                hoursTvPerWeek={hoursTvPerWeek}
                onSocialHoursChange={setHoursSocialPerWeek}
                onTvHoursChange={setHoursTvPerWeek}
                socialTopicLabel={weeklySocialLabel}
                tvTopicLabel={weeklyTvLabel}
                onSocialTopicChange={setWeeklySocialLabel}
                onTvTopicChange={setWeeklyTvLabel}
                monthsAheadSocial={birthInvalidFuture ? 0 : (futureMonthsPerActivity.get(WEEKLY_TOPIC_SOCIAL_KEY) ?? 0)}
                monthsAheadTv={birthInvalidFuture ? 0 : (futureMonthsPerActivity.get(WEEKLY_TOPIC_TV_KEY) ?? 0)}
              />
              {birthInvalidFuture ? (
                <Alert color="red" variant="light" title="Check your birth date">
                  Choose a date on or before today so the timeline makes sense.
                </Alert>
              ) : (
                <Group gap="sm">
                  <Badge
                    size="lg"
                    variant="filled"
                    radius="sm"
                    className={
                      cohortHover === 'lived'
                        ? 'legend-summary-badge legend-summary-badge--highlight'
                        : dimCohort
                          ? 'legend-summary-badge legend-summary-badge--dim'
                          : undefined
                    }
                  >
                    {livedCount.toLocaleString()} months lived
                  </Badge>
                  <Badge
                    size="lg"
                    variant="light"
                    radius="sm"
                    className={
                      dimCohort && cohortHover !== 'lived'
                        ? 'legend-summary-badge legend-summary-badge--highlight'
                        : cohortHover === 'lived'
                          ? 'legend-summary-badge legend-summary-badge--dim'
                          : undefined
                    }
                  >
                    {remainingCount.toLocaleString()} months left in view
                  </Badge>
                </Group>
              )}
            </Stack>

            <Box
              component="aside"
              aria-label="Topics legend"
              className={
                dimCohort ? 'legend-corner legend-corner--cohort-active' : 'legend-corner'
              }
              maw={{ base: '100%', xs: '100%', sm: 240 }}
              w={{ base: '100%', sm: 'auto' }}
              flex={{ base: '1 1 100%', sm: '0 0 auto' }}
            >
              <Text fw={700} size="xs" tt="uppercase" c="dimmed" mb={8}>
                Topics
              </Text>
              <Text size="xs" c="dimmed" mb={8}>
                Legend: click to pin · hover dots temporarily
              </Text>
              <Stack gap={4}>
                {!birthInvalidFuture && livedCount > 0 && (
                  <Box
                    component="button"
                    type="button"
                    className={`legend-row legend-row--compact ${legendRowClass(cohortHover === 'lived')}`}
                    onClick={() => toggleLegendPin('lived')}
                  >
                    <Group gap={6} wrap="nowrap" justify="flex-start" align="center">
                      <ColorSwatch
                        size={12}
                        color="#ffffff"
                        withShadow
                        style={{
                          border: '1px solid var(--mantine-color-default-border)',
                          flexShrink: 0,
                        }}
                      />
                      <Box style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <Text size="xs" fw={600} lh={1.25} truncate>
                          Past
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.2}>
                          {livedCount.toLocaleString()} mo
                        </Text>
                      </Box>
                    </Group>
                  </Box>
                )}
                {mergedActivitySplits.map((activity) => {
                  const ahead = birthInvalidFuture
                    ? 0
                    : (futureMonthsPerActivity.get(activity.key) ?? 0)
                  const monthPhrase = ahead === 1 ? '1 mo' : `${ahead} mo`
                  const pctShare = birthInvalidFuture
                    ? ''
                    : ` · ~${Math.round(activity.fraction * 100)}%`
                  const hoursNote =
                    !birthInvalidFuture && activity.key === WEEKLY_TOPIC_SOCIAL_KEY
                      ? ` · ${hoursSocialPerWeek} h/wk`
                      : !birthInvalidFuture && activity.key === WEEKLY_TOPIC_TV_KEY
                        ? ` · ${hoursTvPerWeek} h/wk`
                        : ''
                  return (
                    <Box
                      key={activity.key}
                      component="button"
                      type="button"
                      className={`legend-row legend-row--compact ${legendRowClass(cohortHover !== null && cohortHover === activity.key)}`}
                      onClick={() => toggleLegendPin(activity.key)}
                    >
                      <Group gap={6} wrap="nowrap" justify="flex-start" align="center">
                        <ColorSwatch
                          size={12}
                          color={activity.color}
                          withShadow
                          style={{ flexShrink: 0 }}
                        />
                        <Box style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <Text size="xs" fw={600} lh={1.25} truncate>
                            {activity.label}
                          </Text>
                          <Text size="xs" c="dimmed" lh={1.2} lineClamp={1}>
                            {!birthInvalidFuture ? (
                              <>
                                {monthPhrase}
                                {pctShare}
                                {hoursNote}
                              </>
                            ) : (
                              <span>Past × future splits after birth date</span>
                            )}
                          </Text>
                        </Box>
                      </Group>
                    </Box>
                  )
                })}
                {!birthInvalidFuture && hangoverPaint.active && (
                  <Box
                    key={HANGOVER_TOPIC.key}
                    component="button"
                    type="button"
                    disabled={hangoverDots <= 0}
                    className={`legend-row legend-row--compact ${legendRowClass(cohortHover !== null && cohortHover === HANGOVER_TOPIC.key)}`}
                    onClick={() => {
                      if (hangoverDots > 0) toggleLegendPin(HANGOVER_TOPIC.key)
                    }}
                  >
                    <Group gap={6} wrap="nowrap" justify="flex-start" align="center">
                      <ColorSwatch
                        size={12}
                        color={HANGOVER_TOPIC.color}
                        withShadow
                        style={{ flexShrink: 0 }}
                      />
                      <Box style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <Text size="xs" fw={600} lh={1.25} truncate>
                          Hangover overlay
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.2}>
                          {hangoverDots <= 0
                            ? '—'
                            : hangoverDots === 1
                              ? '1 mo tail'
                              : `${hangoverDots} mo tail`}
                        </Text>
                      </Box>
                    </Group>
                  </Box>
                )}
              </Stack>
            </Box>
          </Group>
        </Paper>

        <Paper radius="xl" withBorder shadow="sm" p={0} className="month-calendar-card">
          <div className="month-calendar-head">
            <Group justify="space-between" align="flex-start" gap="sm" wrap="wrap">
              <div style={{ flex: '1 1 14rem', minWidth: 0 }}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed" lh={1.2}>
                  Life calendar
                </Text>
                <Text size="sm" fw={500} mt={4}>
                  {birthInvalidFuture ? (
                    <>{totalMonths.toLocaleString()} months in grid — add a birth date on or before today to separate past vs future.</>
                  ) : (
                    <>
                      <Text span fw={600} inherit>
                        {livedCount.toLocaleString()}
                      </Text>{' '}
                      lived ·{' '}
                      <Text span fw={600} inherit>
                        {remainingCount.toLocaleString()}
                      </Text>{' '}
                      ahead · {totalMonths.toLocaleString()} total
                    </>
                  )}
                </Text>
                <Text size="xs" c="dimmed" mt={6}>
                  {!birthInvalidFuture ? 'One dot · one calendar month · read chronologically along rows' : 'Each dot equals one calendar month'}
                </Text>
              </div>
              {!birthInvalidFuture && jumpTargetIndex !== null && (
                <Button variant="light" size="compact-sm" aria-label="Scroll calendar to today’s month" onClick={jumpToNow}>
                  Jump to now
                </Button>
              )}
            </Group>
          </div>
          <div ref={scrollElRef} className="month-calendar-scroll">
            <div className={`month-grid${dimCohort ? ' month-grid--cohort-dim' : ''}`} role="list" aria-label="Past months white; future months colored. Click a dot for month details · hover dots or pin the legend." onMouseLeave={() => setDotHoverCohort(null)}>
              {!birthInvalidFuture &&
                months.map((monthDate, index) => {
                  const lived = monthDate.getTime() <= startOfThisMonth.getTime()
                  const label = formatMonthLabel(monthDate)

                  if (lived) {
                    const matchesCohort = cohortHover !== null && cohortHover === 'lived'
                    return (
                      <Tooltip key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} label={cohortTooltipForLived(livedCount)} position="top" withArrow openDelay={120}>
                        <button
                          type="button"
                          role="listitem"
                          data-dot-index={index}
                          className={`month-dot month-dot--lived${matchesCohort ? ' month-dot--cohort-highlight' : ''}${inspectIndex === index ? ' month-dot--inspect-open' : ''}`}
                          aria-label={`${monthAriaLived(label)} · click for details`}
                          onMouseEnter={() => setDotHoverCohort('lived')}
                          onClick={(e) => {
                            e.preventDefault()
                            setInspectIndex(index)
                          }}
                        />
                      </Tooltip>
                    )
                  }

                  const slot = months.slice(0, index).filter((d) => d.getTime() > startOfThisMonth.getTime()).length

                  let focus: ActivitySplit
                  if (hangoverDots > 0 && slot >= futureMonthsForSplits) {
                    focus = hangoverTopicSplit
                  } else {
                    const f = futureAssignments[slot]
                    if (!f) {
                      return null
                    }
                    focus = f
                  }

                  const matchesCohort = cohortHover !== null && cohortHover === focus.key
                  const monthsInRun = focus.key === HANGOVER_TOPIC.key ? hangoverDots : (futureMonthsPerActivity.get(focus.key) ?? 0)

                  return (
                    <Tooltip key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`} label={cohortTooltipForActivity(focus, monthsInRun, remainingCount)} position="top" withArrow openDelay={120}>
                      <button
                        type="button"
                        role="listitem"
                        data-dot-index={index}
                        className={`month-dot month-dot--future${matchesCohort ? ' month-dot--cohort-highlight' : ''}${inspectIndex === index ? ' month-dot--inspect-open' : ''}`}
                        style={
                          {
                            backgroundColor: focus.color,
                            '--month-dot-accent': focus.color
                          } as CSSProperties
                        }
                        aria-label={`${monthAriaSummaryFuture(label, focus)} · click for details`}
                        onMouseEnter={() => setDotHoverCohort(focus.key)}
                        onClick={(e) => {
                          e.preventDefault()
                          setInspectIndex(index)
                        }}
                      />
                    </Tooltip>
                  )
                })}
            </div>
          </div>
        </Paper>

        <Modal opened={inspectIndex !== null} onClose={() => setInspectIndex(null)} title={inspectPayload?.label ?? 'Month'} size="sm" centered>
          {!inspectPayload ? (
            <Text size="sm" c="dimmed">
              No details available.
            </Text>
          ) : inspectPayload.lived ? (
            <Stack gap="sm">
              <Text size="sm">
                <Text span fw={700} inherit>
                  Past cohort
                </Text>{' '}
                ({inspectPayload.ordinal.toLocaleString()} of {totalMonths.toLocaleString()} months from your birth-month start)
              </Text>
              <Text size="sm" c="dimmed">
                This is dot {inspectPayload.ordinal.toLocaleString()} of {inspectPayload.livedTotal.toLocaleString()} white lived months up to today. Pin &quot;Past&quot; or hover any lived dot to dim the rest.
              </Text>
              {jumpTargetIndex !== null && (
                <Button
                  variant="light"
                  size="compact-sm"
                  onClick={() => {
                    const j = jumpTargetIndex
                    setInspectIndex(null)
                    queueMicrotask(() => scrollToDotIndex(j))
                  }}
                >
                  Scroll to this month (&quot;now&quot;) in grid
                </Button>
              )}
            </Stack>
          ) : inspectPayload.focus ? (
            <Stack gap="sm">
              <Group gap="sm" wrap="nowrap" align="center">
                <ColorSwatch size={18} color={inspectPayload.focus.color} withShadow style={{ flexShrink: 0 }} />
                <Text size="sm" fw={700} style={{ flex: 1, minWidth: 0 }}>
                  {inspectPayload.focus.label}
                  {inspectPayload.focus.key === HANGOVER_TOPIC.key ? ' · estimate' : ''}
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                Chronological dot {inspectPayload.ordinal.toLocaleString()} of {totalMonths.toLocaleString()} in this 90-year grid — the{' '}
                {inspectPayload.futureOrdinal.toLocaleString()} upcoming month-dot after today (there are{' '}
                {inspectPayload.remainingTotal.toLocaleString()} future dots in total).
              </Text>
              <Text size="sm" c="dimmed">
                {monthsInRunSummary(inspectPayload.monthsInRun)}
              </Text>
              {jumpTargetIndex !== null && (
                <Button
                  variant="light"
                  size="compact-sm"
                  onClick={() => {
                    const j = jumpTargetIndex
                    setInspectIndex(null)
                    queueMicrotask(() => scrollToDotIndex(j))
                  }}
                >
                  Scroll to today&apos;s month in grid
                </Button>
              )}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              This month sits in the horizon but couldn&apos;t be assigned a cohort (try adjusting hangover overlay or refreshing).
            </Text>
          )}
        </Modal>
      </Stack>
    </Container>
  )
}

export default App
