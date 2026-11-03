import type { Snapshot, Ticket } from '../../model.ts'
import { DAY } from './triage/time.ts'

export const demoNow = Date.parse('2026-11-02T09:00:00Z')
const before = (days: number) => new Date(demoNow - days * DAY).toISOString()

function ticket(id: string, title: string, category: string, days: number, fields: Partial<Ticket> = {}): Ticket {
  return {
    id, title, category, createdAt: before(days), description: '', priority: 'MEDIUM',
    status: 'OPEN', blockId: 'Block B', homeId: 'Flat 28', firstResponseAt: null, ...fields,
  }
}

export const demo: Snapshot = {
  tickets: [
    ticket('RQ-108', 'Water through the ceiling', 'LEAK', 1, {
      description: 'Water pouring through the ceiling and pooling near the hallway light.',
      homeId: null, blockId: 'Block A',
    }),
    ticket('RQ-091', 'Radiators cold again', 'HEATING', 9, {
      description: 'The radiators are cold again this morning.', status: 'IN_PROGRESS', firstResponseAt: before(8),
    }),
    ticket('RQ-094', 'Radiators cold upstairs', 'HEATING', 8, { homeId: 'Flat 31' }),
    ticket('RQ-111', 'Communal cupboard handle loose', 'OTHER', 0.25, {
      priority: 'URGENT', homeId: null, firstResponseAt: before(0.2),
    }),
    ticket('RQ-075', 'Radiator valve sticking', 'HEATING', 15, { status: 'RESOLVED' }),
  ],
  feedback: [
    { id: 'F-10', ticketId: 'RQ-091', residentId: 'R-01', score: 1, createdAt: before(2) },
    { id: 'F-09', ticketId: 'RQ-075', residentId: 'R-01', score: 2, createdAt: before(11) },
  ],
  residents: [
    { id: 'R-01', homeId: 'Flat 28', moveOutDate: null },
    { id: 'R-02', homeId: 'Flat 28', moveOutDate: null },
    { id: 'R-03', homeId: 'Flat 31', moveOutDate: null },
  ],
}
