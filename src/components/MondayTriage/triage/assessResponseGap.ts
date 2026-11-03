import { DAY } from './time.ts'

const WARNING_DAYS = 5
const RED_DAYS = 10
const FOLLOW_UP_DAYS = 20

export function assessResponseGap(firstResponseAt: string | null, createdAt: number, now: number) {
  const responseAnchor = firstResponseAt === null ? createdAt : Date.parse(firstResponseAt)
  const daysSinceResponseAnchor = Math.max(0, (now - responseAnchor) / DAY)

  let responseTone: 'neutral' | 'warning' | 'risk' = 'neutral'
  if (daysSinceResponseAnchor >= RED_DAYS) responseTone = 'risk'
  else if (daysSinceResponseAnchor >= WARNING_DAYS) responseTone = 'warning'

  return { responseTone, overdue: daysSinceResponseAnchor > FOLLOW_UP_DAYS }
}
