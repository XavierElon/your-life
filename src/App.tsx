import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  ColorSwatch,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  ACTIVITY_SPLITS,
  cohortTooltipForActivity,
  cohortTooltipForLived,
  monthAriaLived,
  monthAriaSummaryFuture,
} from './activities'
import { allocateFutureMonthsSequential } from './futureAllocation'
import './App.css'

const EXPECTED_LIFESPAN_YEARS = 90

/** 'lived' = all white dots; otherwise activity `key` */
type CohortHover = 'lived' | (string & {})

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, day] = value.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== m - 1 ||
    d.getDate() !== day
  ) {
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

function App() {
  const [birthInput, setBirthInput] = useState('1990-01-01')
  const [cohortHover, setCohortHover] = useState<CohortHover | null>(null)

  const birth = useMemo(() => {
    const parsed = parseDateInput(birthInput)
    return parsed ?? new Date(1990, 0, 1)
  }, [birthInput])

  const now = new Date()
  const startOfThisMonth = startOfMonth(now)
  const birthInvalidFuture = startOfMonth(birth) > startOfThisMonth

  const totalMonths = EXPECTED_LIFESPAN_YEARS * 12
  const months = useMemo(
    () => monthStartsFromFirst(birth, totalMonths),
    [birth, totalMonths],
  )

  const livedCount = birthInvalidFuture
    ? 0
    : months.filter((d) => d.getTime() <= startOfThisMonth.getTime()).length
  const remainingCount = Math.max(0, totalMonths - livedCount)
  const maxBirth = now.toISOString().slice(0, 10)

  const futureAssignments = useMemo(() => {
    if (birthInvalidFuture) return []
    return allocateFutureMonthsSequential(ACTIVITY_SPLITS, remainingCount)
  }, [birthInvalidFuture, remainingCount])

  const futureMonthsPerActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of ACTIVITY_SPLITS) {
      map.set(a.key, 0)
    }
    for (const cell of futureAssignments) {
      map.set(cell.key, (map.get(cell.key) ?? 0) + 1)
    }
    return map
  }, [futureAssignments])

  const dimCohort = cohortHover !== null

  function legendRowClass(isHighlighted: boolean): string {
    return [
      'legend-row',
      dimCohort && !isHighlighted ? 'legend-row--dim' : '',
      dimCohort && isHighlighted ? 'legend-row--highlight' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <Container size="lg" py={{ base: 'md', sm: 'xl' }} px="md">
      <Stack gap="xl">
        <Paper shadow="sm" p={{ base: 'md', sm: 'xl' }} radius="lg" withBorder>
          <Stack gap="md">
            <div>
              <Title order={1} size="h2" fw={700} lts="-0.02em">
                Your life in months
              </Title>
              <Text c="dimmed" size="sm" mt="xs" maw={620}>
                Past months are white. Upcoming months are grouped in order:
                every month for one focus runs in a single contiguous run, then the
                next—so the last block on the right is the final stretch of the
                90-year view (your remaining months of life in this grid).                 Counts per color match the allocations below after scaling across the
                full band. Hover a dot—or a topic row here—to spotlight that cohort in
                the grid and summaries.
              </Text>
            </div>

            <TextInput
              label="Birth date"
              description="We start from the first day of that month."
              type="date"
              max={maxBirth}
              value={birthInput}
              onChange={(e) => setBirthInput(e.currentTarget.value)}
              maw={320}
            />

            <div
              className={
                dimCohort ? 'legend-strip legend-strip--cohort-active' : 'legend-strip'
              }
            >
              <Text fw={600} size="xs" tt="uppercase" c="dimmed" mb={6}>
                Topics (hover to match the grid)
              </Text>
              <Stack gap={6}>
                {!birthInvalidFuture && livedCount > 0 && (
                  <Box
                    className={legendRowClass(cohortHover === 'lived')}
                    onMouseEnter={() => setCohortHover('lived')}
                  >
                    <Group gap={6} wrap="nowrap" align="flex-start">
                      <ColorSwatch
                        size={14}
                        color="#ffffff"
                        withShadow
                        style={{
                          border: '1px solid var(--mantine-color-default-border)',
                        }}
                      />
                      <Text size="xs" c="dimmed" lh={1.35}>
                        <Text span fw={600} c="var(--mantine-color-text)">
                          Past months
                        </Text>
                        {' · '}
                        <Text span fw={600} c="var(--mantine-color-text)" inherit>
                          {livedCount === 1
                            ? '1 month lived'
                            : `${livedCount.toLocaleString()} months lived`}
                        </Text>
                        <span style={{ opacity: 0.82 }}>
                          {' '}
                          (white dots in the grid)
                        </span>
                      </Text>
                    </Group>
                  </Box>
                )}
                {!birthInvalidFuture && (
                  <Text fw={600} size="xs" tt="uppercase" c="dimmed" mt={4} mb={2}>
                    Upcoming bands by share
                  </Text>
                )}
                {ACTIVITY_SPLITS.map((activity) => {
                  const ahead = birthInvalidFuture
                    ? 0
                    : (futureMonthsPerActivity.get(activity.key) ?? 0)
                  const monthPhrase =
                    ahead === 1 ? '1 month' : `${ahead} months`

                  return (
                    <Box
                      key={activity.key}
                      className={legendRowClass(
                        cohortHover !== null && cohortHover === activity.key,
                      )}
                      onMouseEnter={() => setCohortHover(activity.key)}
                    >
                      <Group gap={6} wrap="nowrap" align="flex-start">
                        <ColorSwatch
                          size={14}
                          color={activity.color}
                          withShadow
                        />
                        <Text size="xs" c="dimmed" lh={1.35}>
                          <Text span fw={600} c="var(--mantine-color-text)">
                            {activity.label}
                          </Text>
                          {!birthInvalidFuture && (
                            <>
                              {' · '}
                              <Text span fw={600} c="var(--mantine-color-text)" inherit>
                                {monthPhrase}
                              </Text>
                              <span style={{ opacity: 0.82 }}>
                                {' '}
                                (~{Math.round(activity.fraction * 100)}% of upcoming)
                              </span>
                            </>
                          )}
                        </Text>
                      </Group>
                    </Box>
                  )
                })}
              </Stack>
            </div>

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
        </Paper>

        <Paper
          shadow="xs"
          p={{ base: 'sm', sm: 'md' }}
          radius="lg"
          withBorder
        >
          <div
            className={`month-grid${dimCohort ? ' month-grid--cohort-dim' : ''}`}
            role="list"
            aria-label="Past months white; each future month one activity color. Hover highlights a group."
            onMouseLeave={() => setCohortHover(null)}
          >
            {!birthInvalidFuture &&
              months.map((monthDate, index) => {
                const lived =
                  monthDate.getTime() <= startOfThisMonth.getTime()
                const label = formatMonthLabel(monthDate)

                if (lived) {
                  const matchesCohort =
                    cohortHover !== null && cohortHover === 'lived'
                  return (
                    <Tooltip
                      key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                      label={cohortTooltipForLived(livedCount)}
                      position="top"
                      withArrow
                      openDelay={120}
                    >
                      <button
                        type="button"
                        role="listitem"
                        className={`month-dot month-dot--lived${matchesCohort ? ' month-dot--cohort-highlight' : ''}`}
                        aria-label={monthAriaLived(label)}
                        onMouseEnter={() => setCohortHover('lived')}
                      />
                    </Tooltip>
                  )
                }

                const slot = months
                  .slice(0, index)
                  .filter((d) => d.getTime() > startOfThisMonth.getTime())
                  .length
                const focus = futureAssignments[slot]
                if (!focus) {
                  return null
                }

                const matchesCohort =
                  cohortHover !== null && cohortHover === focus.key
                const monthsInRun = futureMonthsPerActivity.get(focus.key) ?? 0

                return (
                  <Tooltip
                    key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                    label={cohortTooltipForActivity(
                      focus,
                      monthsInRun,
                      remainingCount,
                    )}
                    position="top"
                    withArrow
                    openDelay={120}
                  >
                    <button
                      type="button"
                      role="listitem"
                      className={`month-dot month-dot--future${matchesCohort ? ' month-dot--cohort-highlight' : ''}`}
                      style={{ backgroundColor: focus.color }}
                      aria-label={monthAriaSummaryFuture(label, focus)}
                      onMouseEnter={() => setCohortHover(focus.key)}
                    />
                  </Tooltip>
                )
              })}
          </div>
        </Paper>
      </Stack>
    </Container>
  )
}

export default App
