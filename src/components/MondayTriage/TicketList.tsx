import type { prioritise } from './prioritise.ts'

const reviewTone = { 'Review first': 'risk', 'Follow up': 'warning', Routine: 'neutral' }

export function TicketList({ rows }: { rows: ReturnType<typeof prioritise> }) {
  return <ol className="queue">
    {rows.map(({ ticket, band, tags, topics, age, responseTone, overdue, occupants }) => <li key={ticket.id}>
      <article>
        <div className="ticket-top">
          <div className="location">{ticket.homeId === null
            ? 'Communal area'
            : [ticket.blockId, ticket.homeLabel ?? 'Home details unavailable'].filter(Boolean).join(' · ')}</div>
          <span className={`badge ${reviewTone[band]}`}>{band}</span>
        </div>
        <h3>{ticket.title}</h3>
        {tags.length > 0 && <ul className="ticket-tags" aria-label="Triage signals">
          {tags.map(tag => <li key={tag.label} className="badge risk" title={tag.evidence}>{tag.label}</li>)}
        </ul>}
        <ul className="ticket-tags" aria-label="Ticket topics">
          {topics.map(topic => <li key={topic} className="badge neutral">{topic}</li>)}
        </ul>
        <dl className="ticket-fields">
          <div><dt>Status</dt><dd>{ticket.status === 'OPEN' ? 'Open' : 'In progress'}</dd></div>
          <div><dt>Time unresolved</dt><dd>
            <span className={`badge ${responseTone}`}>
              {age === 0 ? 'Raised today' : `${age} ${age === 1 ? 'day' : 'days'}`}
              {overdue ? ' · Follow-up needed' : responseTone !== 'neutral' ? ' · Response gap' : ''}
            </span>
            <small className="response-note">{ticket.firstResponseAt === null ? 'No first response recorded' : 'Based on first response'}</small>
          </dd></div>
          <div><dt>Reported priority</dt><dd>
            <span className={`badge ${ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'warning' : 'neutral'}`}>
              {ticket.priority[0] + ticket.priority.slice(1).toLowerCase()}
            </span>
          </dd></div>
        </dl>
        <details>
          <summary>Request details</summary>
          <dl className="ticket-fields detail-fields">
            <div><dt>Ticket reference</dt><dd><code>{ticket.id}</code></dd></div>
            <div><dt>Category</dt><dd className="category">{ticket.category.toLowerCase().replaceAll('_', ' ')}</dd></div>
            <div><dt>Block</dt><dd>{ticket.blockId ?? 'Unspecified'}</dd></div>
            {occupants !== null && <div><dt>Current resident records</dt><dd>{occupants}</dd></div>}
            {tags.map(tag => <div key={tag.label}><dt>{tag.label}</dt><dd>{tag.evidence}</dd></div>)}
            {ticket.description && <div className="description"><dt>Resident or staff report</dt><dd>{ticket.description}</dd></div>}
          </dl>
        </details>
      </article>
    </li>)}
  </ol>
}
