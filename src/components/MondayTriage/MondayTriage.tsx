import { useEffect, useState } from 'react'
import { demo, demoNow } from './demo.ts'
import { prioritise, type Band } from './prioritise.ts'
import { loadRiverside, SNAPSHOT_TIME } from '../../api/cortile.ts'
import { TicketList } from './TicketList.tsx'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; queue: ReturnType<typeof prioritise> }
const bands: Band[] = ['Review first', 'Follow up', 'Routine']
const IMMEDIATE_LIMIT = 5

export function MondayTriage() {
  const [filter, setFilter] = useState<Band | 'All'>('All')
  const [topic, setTopic] = useState('')
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
  const immediate = queue.filter(row => row.immediate).slice(0, IMMEDIATE_LIMIT)
  const immediateIds = new Set(immediate.map(row => row.ticket.id))
  const other = queue.filter(row => !immediateIds.has(row.ticket.id))
  const topics = [...new Set(other.flatMap(row => row.topics))].sort()
  const selectedTopic = topics.includes(topic) ? topic : ''
  const topicRows = other.filter(row => !selectedTopic || row.topics.includes(selectedTopic))
  const visible = topicRows.filter(row => filter === 'All' || row.band === filter)

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
        <section className="inbox-panel immediate-panel" aria-labelledby="immediate-title">
          <div className="inbox-heading">
            <h3 id="immediate-title">Immediate follow-up</h3>
            <span className="badge risk">{immediate.length}</span>
          </div>
          <p className="intro">Up to five tickets with possible safety, security or essential-service risks.</p>
          {immediate.length ? <TicketList rows={immediate} /> : <p>No tickets need immediate follow-up.</p>}
        </section>
        <details className="inbox-panel other-panel">
          <summary>Other unresolved tickets <span className="badge neutral">{other.length}</span></summary>
          <label className="topic-filter">
            Topic
            <select value={selectedTopic} onChange={event => setTopic(event.target.value)}>
              <option value="">All topics</option>
              {topics.map(label => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>
          <div className="filters" role="group" aria-label="Filter by review band">
            {(['All', ...bands] as const).map(band =>
              <button key={band} aria-pressed={filter === band} onClick={() => setFilter(band)}>
                {band} <span>{band === 'All' ? topicRows.length : topicRows.filter(row => row.band === band).length}</span>
              </button>)}
          </div>
          {visible.length === 0 && <p role="status">No unresolved tickets match these filters.</p>}
          <TicketList rows={visible} />
        </details>
      </section>}
    </main>
  </>
}
