import { Group, NumberInput, Paper, Stack, Text, TextInput } from '@mantine/core'
import {
  WEEKLY_TOPIC_MAX_HOURS,
  WEEKLY_TOPIC_SOCIAL_COLOR,
  WEEKLY_TOPIC_TV_COLOR
} from './timeBudgetActivities'

type Props = {
  timelineDisabled: boolean
  /** Calendar months ahead in grid (past vs future divider). */
  horizonMonthsAhead: number
  /** Future month-dots that share the proportional split (everything except the hangover rose tail when on). */
  allocationSlotsAmongHorizon: number
  hangoverDotsTakingHorizonTail: number
  hoursSocialPerWeek: number
  hoursTvPerWeek: number
  onSocialHoursChange: (hours: number) => void
  onTvHoursChange: (hours: number) => void
  socialTopicLabel: string
  tvTopicLabel: string
  onSocialTopicChange: (label: string) => void
  onTvTopicChange: (label: string) => void
  monthsAheadSocial: number
  monthsAheadTv: number
}

function numOr(raw: number | string, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function pctOf(slice: number, whole: number): string {
  if (whole <= 0) return '0'
  return Math.round((slice / whole) * 100).toString()
}

export function WeeklyHobbiesSection(props: Props) {
  const {
    timelineDisabled,
    horizonMonthsAhead,
    allocationSlotsAmongHorizon,
    hangoverDotsTakingHorizonTail,
    hoursSocialPerWeek,
    hoursTvPerWeek,
    onSocialHoursChange,
    onTvHoursChange,
    socialTopicLabel,
    tvTopicLabel,
    onSocialTopicChange,
    onTvTopicChange,
    monthsAheadSocial,
    monthsAheadTv
  } = props

  return (
    <Paper shadow="xs" radius="md" withBorder p="xs">
      <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={6}>
        Weekly screen habits
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        Name two topics (defaults below start at zero hours/week). Hours feed the same proportional toy calendar as sleep and work · month counts update as weighted blocks along your horizon · not medical advice.
      </Text>
      {timelineDisabled ? (
        <Text size="xs" c="orange">
          Fix birth date to tune these categories on the horizon.
        </Text>
      ) : (
        <>
          <Stack gap="md" mb="xs">
            <Stack gap={4}>
              <TextInput
                size="xs"
                label="Topic 1 (default: social media)"
                value={socialTopicLabel}
                onChange={(e) => onSocialTopicChange(e.currentTarget.value)}
              />
              <NumberInput
                size="xs"
                label={`${socialTopicLabel.trim() || 'Topic 1'} · hours per week`}
                description="Starts at 0 — increase to pull month-dots from the split"
                min={0}
                max={WEEKLY_TOPIC_MAX_HOURS}
                step={1}
                clampBehavior="strict"
                value={hoursSocialPerWeek}
                onChange={(v) => onSocialHoursChange(numOr(v, hoursSocialPerWeek))}
              />
            </Stack>
            <Stack gap={4}>
              <TextInput
                size="xs"
                label="Topic 2 (default: watching TV)"
                value={tvTopicLabel}
                onChange={(e) => onTvTopicChange(e.currentTarget.value)}
              />
              <NumberInput
                size="xs"
                label={`${tvTopicLabel.trim() || 'Topic 2'} · hours per week`}
                description="Starts at 0 — increase to pull month-dots from the split"
                min={0}
                max={WEEKLY_TOPIC_MAX_HOURS}
                step={1}
                clampBehavior="strict"
                value={hoursTvPerWeek}
                onChange={(v) => onTvHoursChange(numOr(v, hoursTvPerWeek))}
              />
            </Stack>
          </Stack>
          <Text size="xs" c="dimmed" mb="xs">
            You have{' '}
            <Text span fw={600} inherit c="dimmed">
              {horizonMonthsAhead.toLocaleString()}
            </Text>{' '}
            calendar month-dots left in view;{' '}
            <Text span fw={600} inherit c="dimmed">
              {allocationSlotsAmongHorizon.toLocaleString()}
            </Text>{' '}
            participate in this proportional breakdown
            {hangoverDotsTakingHorizonTail > 0
              ? ` (${hangoverDotsTakingHorizonTail.toLocaleString()} rose hangover dots sit at the end)`
              : ''}
            {'.'}
          </Text>
          <Stack gap={6}>
            <Group justify="flex-start" gap="sm" wrap="wrap" align="flex-start">
              <Text size="xs" c="dimmed" maw={{ base: '100%', sm: 440 }}>
                <Text span fw={600} inherit c={WEEKLY_TOPIC_SOCIAL_COLOR}>
                  {socialTopicLabel.trim() || 'Social media'}:
                </Text>{' '}
                modeled{' '}
                <Text span fw={700} inherit>
                  {monthsAheadSocial.toLocaleString()}
                </Text>{' '}
                remaining month-dot{monthsAheadSocial === 1 ? '' : 's'} of{' '}
                <Text span fw={700} inherit>
                  {allocationSlotsAmongHorizon.toLocaleString()}
                </Text>{' '}
                in the split-band (~{pctOf(monthsAheadSocial, allocationSlotsAmongHorizon)}% of that slice, ~
                {pctOf(monthsAheadSocial, horizonMonthsAhead)}% of all months ahead in view).
              </Text>
            </Group>
            <Group justify="flex-start" gap="sm" wrap="wrap" align="flex-start">
              <Text size="xs" c="dimmed" maw={{ base: '100%', sm: 440 }}>
                <Text span fw={600} inherit c={WEEKLY_TOPIC_TV_COLOR}>
                  {tvTopicLabel.trim() || 'Watching TV'}:
                </Text>{' '}
                modeled{' '}
                <Text span fw={700} inherit>
                  {monthsAheadTv.toLocaleString()}
                </Text>{' '}
                remaining month-dot{monthsAheadTv === 1 ? '' : 's'} of{' '}
                <Text span fw={700} inherit>
                  {allocationSlotsAmongHorizon.toLocaleString()}
                </Text>{' '}
                in the split-band (~{pctOf(monthsAheadTv, allocationSlotsAmongHorizon)}% of that slice, ~
                {pctOf(monthsAheadTv, horizonMonthsAhead)}% of all months ahead in view).
              </Text>
            </Group>
          </Stack>
        </>
      )}
    </Paper>
  )
}
