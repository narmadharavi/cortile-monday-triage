import type { Ticket } from '../../../model.ts'

const topicRules = [
  { label: 'Security & access', categories: ['DOOR_ACCESS', 'LIFT'],
    wording: /\b(?:windows?|front doors?|entry doors?|locks?|key fobs?|intercoms?|lifts?|elevators?|communal)\b/i },
  { label: 'Lifts', categories: ['LIFT'], wording: /\b(?:lifts?|elevators?)\b/i },
  { label: 'Plumbing & leaks', categories: ['LEAK'],
    wording: /\b(?:leaks?|leaking|toilets?|drains?|draining|flooding|water supply|running water)\b/i },
  { label: 'Heating & hot water', categories: ['HEATING'],
    wording: /\b(?:heating|radiators?|boilers?|hot water)\b/i },
  { label: 'Electrical', categories: ['ELECTRICAL'],
    wording: /\b(?:electrics|electrical|electricity|sockets?|wiring|power (?:cut|outage))\b/i },
  { label: 'Appliances', categories: ['APPLIANCE'],
    wording: /\b(?:dishwashers?|ovens?|washing machines?|fridges?|freezers?)\b/i },
  { label: 'Noise', categories: ['NOISE'], wording: /\b(?:noise|barking|loud music)\b/i },
  { label: 'Pests', categories: ['PEST'], wording: /\b(?:pests?|mice|rats|cockroaches?)\b/i },
]

export function classifyTopics(ticket: Ticket): string[] {
  const wording = `${ticket.title}. ${ticket.description}`
  const topics = topicRules
    .filter(rule => rule.categories.includes(ticket.category) || rule.wording.test(wording))
    .map(rule => rule.label)

  if (ticket.homeId === null || /\b(?:communal|shared areas?|common areas?)\b/i.test(wording)) {
    topics.push('Communal areas')
  }
  return topics.length ? topics : ['General repairs']
}
