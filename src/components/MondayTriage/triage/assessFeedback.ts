import type { Feedback, Ticket } from '../../../model.ts'

export function assessFeedback(ticket: Ticket, recentLow: Feedback[]) {
  const ratings = recentLow.filter(item => item.ticketId === ticket.id)
  const relevantResidents = new Set(ratings.map(rating => rating.residentId))
  if (ticket.reportedByResidentId) relevantResidents.add(ticket.reportedByResidentId)
  const repeated = [...relevantResidents].some(residentId => {
    const ticketsWithLowFeedback = new Set(recentLow
      .filter(item => item.residentId === residentId && item.ticketId !== null)
      .map(item => item.ticketId))
    return ticketsWithLowFeedback.size >= 2
  })

  return { ratings, repeated }
}
