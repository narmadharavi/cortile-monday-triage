import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { demo, demoNow } from './demo.ts'
import { prioritise, type Band } from './prioritise.ts'
import { loadRiverside, SNAPSHOT_TIME } from './cortile.ts'
import './style.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; queue: ReturnType<typeof prioritise> }
const reviewTone = { 'Review first': 'risk', 'Follow up': 'warning', Routine: 'neutral' }
const bands: Band[] = ['Review first', 'Follow up', 'Routine']

function App() {
  const [filter, setFilter] = useState<Band | 'All'>('All')
  const [source, setSource] = useState<'live' | 'demo'>('live')
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  useEffect(() => {
    if (source !== 'live') return
    const controller = new AbortController()
    loadRiverside(controller.signal).then(snapshot => {
      if (!controller.signal.aborted) setLoad({ status: 'ready', queue: prioritise(snapshot, SNAPSHOT_TIME) })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoad({
        status: 'error', message: error instanceof Error ? error.message : 'The API request failed.',
      })
    })
    return () => controller.abort()
  }, [source, attempt])

  function selectLive() {
    setLoad({ status: 'loading' })
    setSource('live')
    setAttempt(previous => previous + 1)
  }

  const queue = source === 'demo' ? prioritise(demo, demoNow) : load.status === 'ready' ? load.queue : []
  const visible = queue.filter(row => filter === 'All' || row.band === filter)

  return <>
    <div className="app-bar">
      <div className="app-bar-inner">
        <span className="wordmark">cortile</span>
        <span className="community">Riverside Quarter</span>
        <span className="avatar" aria-label="Priya">P</span>
      </div>
    </div>
    <main>
      <header>
        <div className="eyebrow">Maintenance / Requests</div>
        <h1>Monday Triage</h1>
        <p>Priya’s maintenance review queue</p>
        <span className="demo">{source === 'demo' ? 'Demo snapshot · Monday 2 November 2026' : 'Cortile API · 30 September 2026 snapshot'}</span>
        <button className="source-toggle" onClick={source === 'live' ? () => setSource('demo') : selectLive}>
          {source === 'live' ? 'Use demo' : 'Use live data'}
        </button>
      </header>
      {source === 'live' && load.status === 'loading' && <p role="status">Loading Riverside Quarter…</p>}
      {source === 'live' && load.status === 'error' && <div role="alert">
        <p>Couldn’t load Riverside Quarter. {load.message}</p>
        <button onClick={selectLive}>Retry</button>
      </div>}
      {(source === 'demo' || load.status === 'ready') && <section aria-labelledby="queue-title">
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
                <div className="location">{ticket.homeId === null
                  ? 'Communal area'
                  : [ticket.blockId, ticket.homeLabel ?? 'Home details unavailable'].filter(Boolean).join(' · ')}</div>
                <span className={`badge ${reviewTone[band]}`}>{band}</span>
              </div>
              <h3>{ticket.title}</h3>
              <dl className="ticket-fields">
                <div><dt>Status</dt><dd>{ticket.status === 'OPEN' ? 'Open' : 'In progress'}</dd></div>
                <div><dt>Time unresolved</dt><dd>
                  {age >= 10 ? <span className="badge warning">{age} days · Long wait</span>
                    : age === 0 ? 'Raised today' : `${age} ${age === 1 ? 'day' : 'days'}`}
                </dd></div>
                <div><dt>Reported priority</dt><dd>
                  <span className={`badge ${ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'warning' : 'neutral'}`}>
                    {ticket.priority[0] + ticket.priority.slice(1).toLowerCase()}
                  </span>
                </dd></div>
              </dl>
              {reasons.length > 0 && <div className="reasons">
                <h4>Why it’s flagged</h4>
                <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
              </div>}
              <details>
                <summary>Request details</summary>
                <dl className="ticket-fields detail-fields">
                  <div><dt>Ticket reference</dt><dd><code>{ticket.id}</code></dd></div>
                  <div><dt>Category</dt><dd className="category">{ticket.category.toLowerCase().replaceAll('_', ' ')}</dd></div>
                  <div><dt>Block</dt><dd>{ticket.blockId ?? 'Unspecified'}</dd></div>
                  {occupants !== null && <div><dt>Current resident records</dt><dd>{occupants}</dd></div>}
                  {ticket.description && <div className="description"><dt>Resident or staff report</dt><dd>{ticket.description}</dd></div>}
                </dl>
              </details>
            </article>
          </li>)}
        </ol>
      </section>}
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
