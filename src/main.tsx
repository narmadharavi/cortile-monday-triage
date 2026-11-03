import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { demo, demoNow } from './demo.ts'
import { prioritise, type Band } from './prioritise.ts'
import './style.css'

const queue = prioritise(demo, demoNow)
const bands: Band[] = ['Review first', 'Follow up', 'Routine']

function App() {
  const [filter, setFilter] = useState<Band | 'All'>('All')
  const visible = queue.filter(row => filter === 'All' || row.band === filter)

  return <main>
    <header>
      <div className="eyebrow">CORTILE / RIVERSIDE QUARTER</div>
      <h1>Monday Triage</h1>
      <p>Priya’s maintenance review queue</p>
      <span className="demo">Demo snapshot · Monday 2 November 2026</span>
    </header>
    <section aria-labelledby="queue-title">
      <h2 id="queue-title">Unresolved tickets</h2>
      <p className="intro">Review possible safety and property risks first, then follow up on resident feedback and service delays.</p>
      <div className="filters" role="group" aria-label="Filter by review band">
        {(['All', ...bands] as const).map(band =>
          <button key={band} aria-pressed={filter === band} onClick={() => setFilter(band)}>
            {band} <span>{band === 'All' ? queue.length : queue.filter(row => row.band === band).length}</span>
          </button>)}
      </div>
      {visible.length === 0 && <p role="status">No unresolved tickets in this band.</p>}
      <ol className="queue">
        {visible.map(({ ticket, band, reasons, age, occupants }) => <li key={ticket.id}>
          <article>
            <div className="ticket-top">
              <div className="eyebrow">{ticket.id} · {ticket.blockId ?? 'Block unknown'} · {ticket.homeId ?? 'Communal'}</div>
              <span className={band === 'Review first' ? 'badge risk' : 'badge'}>{band}</span>
            </div>
            <h3>{ticket.title}</h3>
            <p className="meta">{ticket.status === 'OPEN' ? 'Open' : 'In progress'} · {age === 0 ? 'Raised today' : `Raised ${age}d ago`} · Reported {ticket.priority.toLowerCase()}</p>
            {reasons.length > 0 && <ul className="reasons">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
            <details>
              <summary>Ticket details</summary>
              {ticket.description && <p>{ticket.description}</p>}
              <p>{ticket.category.replaceAll('_', ' ')} · {occupants === null ? 'Communal location' : `${occupants} current resident records`}</p>
            </details>
          </article>
        </li>)}
      </ol>
    </section>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
