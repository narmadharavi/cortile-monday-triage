import type { Snapshot, Ticket } from './model.ts'

export const DAY = 86_400_000
const hazards: Record<string, RegExp> = {
  LEAK: /\b(?:water (?:near|through|on) (?:the )?(?:electrics|socket|wiring)|ceiling (?:bulging|collapsed))\b/i,
  ELECTRICAL: /\b(?:sparks|sparking|burning smell|exposed wir(?:e|es|ing)|electric shock)\b/i,
  DOOR_ACCESS: /\b(?:cannot lock|won't lock|door stuck open|forced entry)\b/i,
  LIFT: /\b(?:trapped|stuck inside)\b/i,
  HEATING: /\b(?:no heating|total loss of heating|heating completely off)\b/i,
}

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
    const wording = `${ticket.title}. ${ticket.description}`
    const hazard = hazards[ticket.category]?.exec(wording)
    const damage = /\b(?:water pouring|active flooding|spreading damp|water through (?:the )?ceiling|leak (?:is )?getting worse)\b/i.exec(wording)
    const group = blocks.get(JSON.stringify([ticket.blockId, ticket.category])) ?? []
    const homes = new Set(group.filter(peer => Math.abs(Date.parse(peer.createdAt) - created) <= 2 * DAY)
      .map(peer => peer.homeId).filter(id => id !== null))
    const ratings = recentLow.filter(item => item.ticketId === ticket.id)
    const repeated = ratings.some(rating => recentLow.some(other =>
      other.residentId === rating.residentId && other.ticketId !== ticket.id))
    const reasons: string[] = []
    const risk = Boolean(hazard || damage)
    let followUp = 0

    if (hazard) reasons.push(`Possible safety or essential-service risk · “${hazard[0]}”`)
    if (damage) reasons.push(`Possible worsening property damage · “${damage[0]}”`)
    if (homes.size >= 2) {
      followUp += 4
      reasons.push(`Possible wider issue · similar reports from ${homes.size} homes in ${ticket.blockId} within 48 hours of this report`)
    }
    if (ratings.length) {
      followUp += 3
      reasons.push(`Recent ticket satisfaction · ${Math.min(...ratings.map(item => item.score))}/5`)
    }
    if (repeated) {
      followUp += 2
      reasons.push('Recent low feedback from the same resident on another ticket')
    }
    if (ticket.firstResponseAt === null) {
      followUp += age >= 1 ? 2 : 1
      reasons.push('No first response recorded')
    }
    if (age >= 7) {
      followUp += 2
      reasons.push(`Unresolved for ${age} days`)
    }

    const reported = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 }[ticket.priority]
    const band: Band = risk ? 'Review first' : followUp > 0 ? 'Follow up' : 'Routine'
    const occupants = ticket.homeId === null ? null : new Set(snapshot.residents
      .filter(resident => resident.homeId === ticket.homeId
        && (resident.moveOutDate === null || Date.parse(resident.moveOutDate) > now))
      .map(resident => resident.id)).size
    return { ticket, band, reasons, age, occupants, risk, followUp, reported }
  }).sort((a, b) => Number(b.risk) - Number(a.risk)
    || b.followUp - a.followUp || b.reported - a.reported || b.age - a.age
    || a.ticket.id.localeCompare(b.ticket.id))
}
