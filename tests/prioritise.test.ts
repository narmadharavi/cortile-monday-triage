import assert from 'node:assert/strict'
import test from 'node:test'
import { demo, demoNow } from '../src/components/MondayTriage/demo.ts'
import { prioritise } from '../src/components/MondayTriage/prioritise.ts'

test('possible property damage outranks reported urgency and resolved work is excluded', () => {
  const rows = prioritise(demo, demoNow)
  assert.deepEqual(rows.map(row => row.ticket.id), ['RQ-108', 'RQ-091', 'RQ-094', 'RQ-111'])
  assert.equal(rows[0].band, 'Follow up')
  assert.equal(rows[3].band, 'Routine')
})

test('surfaces distinct evidence for resident experience, delays and possible wider impact', () => {
  const [, feedback, unanswered] = prioritise(demo, demoNow)
  assert.match(feedback.tags.flatMap(tag => [tag.label, tag.evidence]).join('\n'), /2 homes/)
  assert.match(feedback.tags.flatMap(tag => [tag.label, tag.evidence]).join('\n'), /1\/5/)
  assert.match(feedback.tags.flatMap(tag => [tag.label, tag.evidence]).join('\n'), /multiple tickets/)
  assert.equal(feedback.age, 9)
  assert.equal(unanswered.responseTone, 'warning')
})

test('occupancy changes context without changing ranking', () => {
  const rows = prioritise(demo, demoNow)
  const withoutResidents = prioritise({ ...demo, residents: [] }, demoNow)
  assert.equal(rows[1].occupants, 2)
  assert.equal(withoutResidents[1].occupants, 0)
  assert.deepEqual(rows.map(row => row.ticket.id), withoutResidents.map(row => row.ticket.id))
})

test('category needs corroborating wording and clusters need distinct homes in one block', () => {
  const tickets = demo.tickets.map(ticket => ticket.id === 'RQ-108'
    ? { ...ticket, title: 'Dripping tap', description: 'One drip per minute' }
    : ticket.id === 'RQ-094' ? { ...ticket, blockId: 'Block A' } : ticket)
  const rows = prioritise({ ...demo, tickets }, demoNow)
  assert.ok(rows.every(row => row.band !== 'Review first'))
  assert.ok(rows.every(row => row.tags.every(tag => !tag.label.includes('Possible wider issue'))))
})

test('possible lift door faults outrank routine appliance failures', () => {
  const base = demo.tickets[0]
  const tickets = [
    { ...base, id: 'dishwasher', category: 'APPLIANCE', title: 'Dishwasher not working',
      description: 'The dishwasher will not start.', priority: 'URGENT' as const },
    { ...base, id: 'lift', category: 'LIFT', title: 'Lift doors not closing properly',
      description: '', priority: 'MEDIUM' as const },
  ]
  const [first, second] = prioritise({ tickets, feedback: [], residents: [] }, demoNow)
  assert.equal(first.ticket.id, 'lift')
  assert.equal(first.band, 'Review first')
  assert.match(first.tags.map(tag => tag.evidence).join(' '), /Possible safety/)
  assert.notEqual(second.band, 'Review first')
})

test('communal safety risks rank ahead of other risks without promoting routine communal work', () => {
  const base = demo.tickets[0]
  const tickets = [
    { ...base, id: 'private', homeId: 'Flat 28', category: 'ELECTRICAL', title: 'Sparks from socket', description: '' },
    { ...base, id: 'communal', homeId: null, category: 'LIFT', title: 'Lift doors not closing properly',
      description: '', firstResponseAt: base.createdAt },
    { ...base, id: 'routine', homeId: null, category: 'OTHER', title: 'Scuffed paint',
      description: '', firstResponseAt: base.createdAt },
  ]
  const rows = prioritise({ tickets, feedback: [], residents: [] }, demoNow)
  assert.deepEqual(rows.map(row => row.ticket.id), ['communal', 'private', 'routine'])
  assert.ok(rows[0].tags.some(tag => tag.label === 'Communal safety risk'))
  assert.equal(rows[2].band, 'Routine')
})

test('response gaps change colour at five and ten days and flag follow-up after twenty', () => {
  const base = { ...demo.tickets[3], homeId: null, category: 'OTHER' }
  for (const [days, tone, band] of [
    [4.5, 'neutral', 'Routine'],
    [5, 'warning', 'Routine'],
    [10, 'risk', 'Routine'],
    [20, 'risk', 'Routine'],
    [20.5, 'risk', 'Follow up'],
  ] as const) {
    const timestamp = new Date(demoNow - days * 86_400_000).toISOString()
    for (const ticket of [
      { ...base, createdAt: timestamp, firstResponseAt: null },
      { ...base, createdAt: new Date(demoNow - 30 * 86_400_000).toISOString(), firstResponseAt: timestamp },
    ]) {
      const [row] = prioritise({ tickets: [ticket], residents: [], feedback: [] }, demoNow)
      assert.equal(row.responseTone, tone)
      assert.equal(row.band, band)
      assert.equal(row.immediate, false)
    }
  }
})

test('immediate follow-up contains lift grinding and utility loss, while overdue noise stays below', () => {
  const base = { ...demo.tickets[0], description: '', homeId: null }
  const tickets = [
    { ...base, id: 'noise', category: 'NOISE', title: 'Dog barking all day',
      createdAt: '2026-10-01T09:00:00Z' },
    { ...base, id: 'lift', category: 'LIFT', title: 'Lift making grinding noise' },
    { ...base, id: 'water', category: 'OTHER', title: 'No running water' },
    { ...base, id: 'damage', category: 'LEAK', title: 'Leak getting worse' },
  ]
  const rows = prioritise({ tickets, feedback: [], residents: [] }, demoNow)
  assert.deepEqual(rows.filter(row => row.immediate).map(row => row.ticket.id), ['lift', 'water'])
  assert.equal(rows.find(row => row.ticket.id === 'noise')?.overdue, true)
})

test('security, water damage and equipment signals outrank noise reports', () => {
  const base = { ...demo.tickets[3], description: '' }
  const examples = [
    ['window', "Window won't close fully", 'OTHER'],
    ['toilet', 'Toilet leaking at the base', 'LEAK'],
    ['dishwasher', 'Dishwasher not draining', 'APPLIANCE'],
    ['radiator', 'Radiator not heating up', 'HEATING'],
    ['oven', 'Oven not heating', 'APPLIANCE'],
    ['dog', 'Dog barking all day', 'NOISE'],
    ['music', 'Loud music', 'NOISE'],
  ]
  const tickets = examples.map(([id, title, category]) => ({ ...base, id, title, category }))
  const rows = prioritise({ tickets, feedback: [], residents: [] }, demoNow)
  assert.deepEqual(rows.filter(row => row.immediate).map(row => row.ticket.id), ['window'])
  assert.deepEqual(new Set(rows.slice(1, 5).map(row => row.ticket.id)), new Set(['toilet', 'dishwasher', 'radiator', 'oven']))
  assert.ok(rows.slice(1, 5).every(row => row.band === 'Follow up'))
  assert.ok(rows.slice(5).every(row => row.band === 'Routine'))
})
