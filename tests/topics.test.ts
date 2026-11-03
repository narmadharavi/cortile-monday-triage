import assert from 'node:assert/strict'
import test from 'node:test'
import { demo, demoNow } from '../src/components/MondayTriage/demo.ts'
import { prioritise } from '../src/components/MondayTriage/prioritise.ts'

test('topics combine category, wording and location independently of immediate priority', () => {
  const base = demo.tickets[3]
  const tickets = [
    { ...base, id: 'lift', homeId: null, category: 'LIFT', title: 'Lift light needs cleaning' },
    { ...base, id: 'dishwasher', homeId: 'Flat 28', category: 'APPLIANCE', title: 'Dishwasher not draining' },
    { ...base, id: 'window', homeId: 'Flat 28', category: 'OTHER', title: 'Window handle scratched' },
  ]
  const rows = prioritise({ tickets, residents: [], feedback: [] }, demoNow)
  const byId = new Map(rows.map(row => [row.ticket.id, row]))
  assert.deepEqual(byId.get('lift')?.topics, ['Security & access', 'Lifts', 'Communal areas'])
  assert.deepEqual(byId.get('dishwasher')?.topics, ['Plumbing & leaks', 'Appliances'])
  assert.deepEqual(byId.get('window')?.topics, ['Security & access'])
  assert.ok(rows.every(row => !row.immediate))
})
