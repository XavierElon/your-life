import { useEffect, useMemo, useState } from 'react'
import { Checkbox, Group, NumberInput, Paper, SimpleGrid, Text } from '@mantine/core'
import {
  AVG_DAYS_PER_MONTH,
  computeHangoverMetrics,
  HANGOVER_TOPIC,
  hangoverDotsFromMetrics,
  type HangoverPaint,
} from './hangoverEstimate'

type Props = {
  remainingDots: number
  totalDots: number
  timelineDisabled: boolean
  onPaintChange: (p: HangoverPaint) => void
}

function numOr(raw: number | string, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function HangoverSection(props: Props) {
  const { remainingDots, totalDots, timelineDisabled, onPaintChange } = props

  const [modelOn, setModelOn] = useState(false)
  const [drinkingDaysPm, setDrinkingDaysPm] = useState(8)
  const [lostPerDrinkDay, setLostPerDrinkDay] = useState(0.35)

  const metrics = useMemo(
    () =>
      computeHangoverMetrics(
        {
          drinkingDaysPerMonth: drinkingDaysPm,
          avgDaysLostPerDrinkDay: lostPerDrinkDay,
        },
        remainingDots,
        totalDots,
      ),
    [drinkingDaysPm, lostPerDrinkDay, remainingDots, totalDots],
  )

  useEffect(() => {
    if (timelineDisabled || !modelOn) {
      onPaintChange({ active: false, dotCount: 0 })
      return
    }
    const dots = hangoverDotsFromMetrics(
      metrics.equivalentDotMonthsAcrossRemaining,
      remainingDots,
    )
    onPaintChange({ active: true, dotCount: dots })
  }, [
    timelineDisabled,
    modelOn,
    metrics.equivalentDotMonthsAcrossRemaining,
    remainingDots,
    onPaintChange,
  ])

  const roundedDots = hangoverDotsFromMetrics(
    metrics.equivalentDotMonthsAcrossRemaining,
    remainingDots,
  )

  return (
    <Paper shadow="xs" radius="md" withBorder p="xs">
      <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6}>
        Drinking & hangover (optional overlay)
      </Text>
      {timelineDisabled ? (
        <Text size="xs" c="orange">
          Fix birth date to paint the grid.
        </Text>
      ) : (
        <>
          <Checkbox
            checked={modelOn}
            size="xs"
            label="Show downtime as rose months at end of timeline"
            onChange={(e) => setModelOn(e.currentTarget.checked)}
            mb="xs"
          />
          {!modelOn ? (
            <Text size="xs" c="dimmed" lh={1.4}>
              Estimates impairment days/month, then paints that many upcoming
              month-dots rose at the right of the grid (not medical advice).
            </Text>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" mb="xs">
                <NumberInput
                  size="xs"
                  label="Drink days / mo"
                  min={0}
                  max={31}
                  step={1}
                  clampBehavior="strict"
                  value={drinkingDaysPm}
                  onChange={(v) =>
                    setDrinkingDaysPm(numOr(v, drinkingDaysPm))
                  }
                />
                <NumberInput
                  size="xs"
                  label="Days lost / drink day (avg)"
                  description="Fractions ok · impairing days averaged per drinking day."
                  min={0}
                  max={14}
                  step={0.05}
                  clampBehavior="strict"
                  decimalScale={2}
                  value={lostPerDrinkDay}
                  onChange={(v) =>
                    setLostPerDrinkDay(numOr(v, lostPerDrinkDay))
                  }
                />
              </SimpleGrid>
              <Group justify="space-between" gap="xs" wrap="wrap">
                <Text size="xs" c="dimmed">
                  ~
                  <Text span fw={600} inherit c="var(--mantine-color-text)">
                    {metrics.expectedLostDaysPerCalendarMonth.toFixed(1)}
                  </Text>
                  d impaired / avg month (~{AVG_DAYS_PER_MONTH}d)
                </Text>
                <Text size="xs" c="dimmed">
                  <Text span fw={600} inherit c={HANGOVER_TOPIC.color}>
                    {roundedDots}
                  </Text>
                  &nbsp;rose month-dots
                </Text>
              </Group>
            </>
          )}
        </>
      )}
    </Paper>
  )
}
