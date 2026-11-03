import type { Ticket } from '../../../model.ts'

export interface TriageTag {
  label: string
  evidence: string
}

const hazards: Record<string, RegExp> = {
  LEAK: /\b(?:water (?:near|through|on) (?:the )?(?:electrics|socket|wiring)|ceiling (?:bulging|collapsed))\b/i,
  ELECTRICAL: /\b(?:sparks|sparking|burning smell|exposed wir(?:e|es|ing)|electric shock)\b/i,
  DOOR_ACCESS: /\b(?:cannot lock|won't lock|door stuck open|forced entry)\b/i,
  LIFT: /\b(?:trapped|stuck inside|grinding (?:noise|sound)|(?:lift )?doors? (?:not closing|won.t close|will not close|fail(?:s|ing)? to close|stuck open))\b/i,
  HEATING: /\b(?:no heating|total loss of heating|heating completely off)\b/i,
}

const unsecuredWindow = /\bwindow (?:won['’]t close|will not close|cannot close|can['’]t close|not closing|won['’]t lock|will not lock|cannot lock)\b/i
const waterDamage = /\b(?:toilet leaking|leaking at the base|dishwasher not draining|dishwasher won['’]t drain)\b/i
const equipmentFault = /\b(?:radiator|oven) (?:not heating|won['’]t heat|will not heat)\b/i

export function assessReportedRisk(ticket: Ticket) {
  const wording = `${ticket.title}. ${ticket.description}`
  const hazard = hazards[ticket.category]?.exec(wording) ?? unsecuredWindow.exec(wording)
  const utilityRestriction = /\b(?:no (?:heating|hot water|running water|electricity|power)|(?:total|complete) loss of (?:heating|hot water|water supply|electricity|power))\b/i.exec(wording)
  const damage = /\b(?:water pouring|active flooding|spreading damp|water through (?:the )?ceiling|leak (?:is )?getting worse)\b/i.exec(wording)
  const waterDamageClue = damage ?? waterDamage.exec(wording)
  const equipmentFaultClue = equipmentFault.exec(wording)
  const immediate = Boolean(hazard || utilityRestriction)
  const communalSafety = Boolean(hazard) && ticket.homeId === null
  const tags: TriageTag[] = []

  if (hazard) tags.push({
    label: communalSafety ? 'Communal safety risk' : 'Possible safety risk',
    evidence: `Possible safety or essential-service risk · “${hazard[0]}”`,
  })
  if (utilityRestriction) tags.push({
    label: 'Possible essential-service restriction',
    evidence: `Reported loss of an essential service · “${utilityRestriction[0]}”`,
  })
  if (waterDamageClue) tags.push({
    label: 'Property damage risk',
    evidence: `Possible worsening property damage · “${waterDamageClue[0]}”`,
  })
  if (equipmentFaultClue) tags.push({
    label: 'Possible equipment fault',
    evidence: `Reported equipment failure · “${equipmentFaultClue[0]}”`,
  })

  return { immediate, communalSafety, risk: immediate || Boolean(waterDamageClue || equipmentFaultClue), tags }
}
