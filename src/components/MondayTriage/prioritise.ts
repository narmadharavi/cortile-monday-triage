import type { Snapshot, Ticket } from '../../model.ts'
import { assessFeedback } from './triage/assessFeedback.ts'
import { assessReportedRisk } from './triage/assessReportedRisk.ts'
import { assessResponseGap } from './triage/assessResponseGap.ts'
import { classifyTopics } from './triage/classifyTopics.ts'
import { DAY } from './triage/time.ts'

export type Band = 'Review first' | 'Follow up' | 'Routine'

export function prioritise(snapshot: Snapshot, now: number) {
  const open = snapshot.tickets.filter(ticket => ticket.status !== 'RESOLVED')
  const recentLow = [...new Map(snapshot.feedback.map(item => [item.id, item])).values()]
    .filter(item => item.score >= 1 && item.score <= 2 && now - Date.parse(item.createdAt) >= 0
      && now - Date.parse(item.createdAt) <= 30 * DAY)
  const blocks = new Map<string, Ticket[]>()
  for (const ticket of open) {
    if (!ticket.blockId) continue
    const key = JSON.stringify([ticket.blockId, ticket.category])
    const group = blocks.get(key) ?? []
    group.push(ticket)
    blocks.set(key, group)
  }

  return open.map(ticket => {
    const created = Date.parse(ticket.createdAt)
    const age = Math.max(0, Math.floor((now - created) / DAY))
    const { responseTone, overdue } = assessResponseGap(ticket.firstResponseAt, created, now)

    const group = blocks.get(JSON.stringify([ticket.blockId, ticket.category])) ?? []
    const homes = new Set(group.filter(peer => Math.abs(Date.parse(peer.createdAt) - created) <= 2 * DAY)
      .map(peer => peer.homeId).filter(id => id !== null))
    const { ratings, repeated } = assessFeedback(ticket, recentLow)
    const { tags, immediate, risk, communalSafety } = assessReportedRisk(ticket)
    let followUp = 0

    if (homes.size >= 2) {
      followUp += 4
      tags.push({ label: `Cluster · ${homes.size} homes`, evidence: `Similar reports in ${ticket.blockId} within 48 hours of this report` })
    }
    if (ratings.length) {
      followUp += 3
      tags.push({ label: `Low rating · ${Math.min(...ratings.map(item => item.score))}/5`, evidence: 'Ticket feedback in the last 30 days' })
    }
    if (repeated) {
      followUp += 2
      tags.push({ label: 'Repeat low ratings', evidence: 'Recent low feedback from the same resident on multiple tickets' })
    }
    if (overdue) followUp += 2

    const reported = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 }[ticket.priority]
    let band: Band = 'Routine'
    if (immediate) band = 'Review first'
    else if (risk || followUp > 0) band = 'Follow up'
    const occupants = ticket.homeId === null ? null : new Set(snapshot.residents
      .filter(resident => resident.homeId === ticket.homeId
        && (!resident.moveInDate || Date.parse(resident.moveInDate) <= now)
        && (resident.moveOutDate === null || Date.parse(resident.moveOutDate) > now))
      .map(resident => resident.id)).size
    return { ticket, band, tags, topics: classifyTopics(ticket), age, responseTone, overdue, immediate, occupants, risk, communalSafety, followUp, reported }
  }).sort((a, b) => Number(b.immediate) - Number(a.immediate)
    || Number(b.risk) - Number(a.risk)
    || Number(b.communalSafety) - Number(a.communalSafety)
    || b.followUp - a.followUp || b.reported - a.reported || b.age - a.age
    || a.ticket.id.localeCompare(b.ticket.id))
}
