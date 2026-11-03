import assert from 'node:assert/strict'
import test from 'node:test'
import { demo, demoNow } from './demo.ts'
import { prioritise } from './prioritise.ts'

test('possible property damage outranks reported urgency and resolved work is excluded', () => {
  const rows = prioritise(demo, demoNow)
  assert.deepEqual(rows.map(row => row.ticket.id), ['RQ-108', 'RQ-091', 'RQ-094', 'RQ-111'])
  assert.equal(rows[0].band, 'Review first')
  assert.equal(rows[3].band, 'Routine')
})

test('surfaces distinct evidence for resident experience, delays and possible wider impact', () => {
  const [, feedback, unanswered] = prioritise(demo, demoNow)
  assert.match(feedback.reasons.join('\n'), /2 homes/)
  assert.match(feedback.reasons.join('\n'), /1\/5/)
  assert.match(feedback.reasons.join('\n'), /another ticket/)
  assert.match(feedback.reasons.join('\n'), /9 days/)
  assert.ok(unanswered.reasons.includes('No first response recorded'))
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
  assert.ok(rows.every(row => row.reasons.every(reason => !reason.includes('Possible wider issue'))))
})
