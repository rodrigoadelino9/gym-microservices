import { SERVICES, clearLog, useCommunicationLog } from '../api.js'

function statusTone(status) {
  if (!status) return 'error'
  if (status >= 500) return 'error'
  if (status >= 400) return 'warn'
  return 'ok'
}

const SHORT = { user: 'User', payment: 'Payment', enrollment: 'Enrollment', attendance: 'Attendance' }

export default function CommunicationLog() {
  const log = useCommunicationLog()

  return (
    <aside className="log">
      <header className="log-header">
        <div>
          <h2>Comunicação</h2>
          <p className="muted">Requisições Frontend → Gateway → Serviços</p>
        </div>
        <button type="button" className="btn-ghost" onClick={clearLog} disabled={!log.length}>
          Limpar
        </button>
      </header>

      {log.length === 0 && <p className="empty">Nenhuma requisição ainda.</p>}

      <ol className="log-list">
        {log.map((e) => (
          <li key={e.id} className="log-item">
            <div className="log-line">
              <span className="log-time">{e.at.toLocaleTimeString('pt-BR')}</span>
              <span className={`svc svc-${e.service}`}>{SHORT[e.service] || SERVICES[e.service]?.name}</span>
              <span className={`status status-${statusTone(e.status)}`}>{e.status ?? 'ERR'}</span>
              <span className="log-ms">{e.ms} ms</span>
            </div>
            <code className="log-path">
              <b>{e.method}</b> {e.path}
            </code>
            {e.upstream.map((u, i) => (
              <div key={i} className="log-upstream">
                <span className="arrow">↳</span>
                <span className={`svc svc-${e.service}`}>{SHORT[e.service]}</span>→
                <span className={`svc svc-${(u.service || '').replace(/-service$/, '')}`}>
                  {SHORT[(u.service || '').replace(/-service$/, '')] || u.service}
                </span>
                <code>
                  {u.method} {u.path}
                </code>
                <span className={`status status-${statusTone(u.status)}`}>{u.status ?? 'ERR'}</span>
                <span className="log-ms">{u.ms} ms</span>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </aside>
  )
}
