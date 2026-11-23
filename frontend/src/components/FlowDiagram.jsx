import { useEffect, useState } from 'react'
import { useCommunicationLog } from '../api.js'

const NODES = {
  frontend: { x: 220, y: 12, w: 200, title: 'Frontend', sub: 'React' },
  gateway: { x: 220, y: 100, w: 200, title: 'API Gateway', sub: 'Vercel rewrites / Nginx' },
  enrollment: { x: 30, y: 196, w: 230, title: 'Enrollment Service', sub: 'Python · FastAPI · provedor' },
  attendance: { x: 380, y: 196, w: 230, title: 'Attendance Service', sub: 'Python · FastAPI · consumidor' },
  enrollment_db: { x: 55, y: 330, w: 180, title: 'enrollment_db', sub: 'MySQL', db: true },
  attendance_db: { x: 405, y: 330, w: 180, title: 'attendance_db', sub: 'MySQL', db: true },
}
const NODE_GROUPS = {
  enrollment: NODES,
  user: {
    frontend: NODES.frontend,
    gateway: NODES.gateway,
    user: { ...NODES.enrollment, title: 'User Service', sub: 'Node.js · provedor' },
    payment: { ...NODES.attendance, title: 'Payment Service', sub: 'Node.js · consumidor' },
    user_db: { ...NODES.enrollment_db, title: 'user_db' },
    payment_db: { ...NODES.attendance_db, title: 'payment_db' },
  },
}
const NODE_H = 52

const EDGES = {
  'frontend-gateway': [320, 64, 320, 100],
  'gateway-enrollment': [300, 152, 160, 196],
  'gateway-attendance': [340, 152, 480, 196],
  'attendance-enrollment': [380, 222, 260, 222],
  'enrollment-db': [145, 248, 145, 330],
  'attendance-db': [495, 248, 495, 330],
}

const NODE_EDGES = {
  'frontend-gateway': EDGES['frontend-gateway'],
  'gateway-user': EDGES['gateway-enrollment'],
  'gateway-payment': EDGES['gateway-attendance'],
  'payment-user': EDGES['attendance-enrollment'],
  'user-db': EDGES['enrollment-db'],
  'payment-db': EDGES['attendance-db'],
}

function activeFor(entry) {
  const nodes = new Set(['frontend', 'gateway', entry.service])
  const edges = new Set(['frontend-gateway', `gateway-${entry.service}`])
  if (entry.status && entry.status < 500) {
    nodes.add(`${entry.service}_db`)
    edges.add(`${entry.service}-db`)
  }
  for (const call of entry.upstream) {
    const service = call.service.replace(/-service$/, '')
    nodes.add(service)
    edges.add(`${entry.service}-${service}`)
    if (call.status && call.status < 500) {
      nodes.add(`${service}_db`)
      edges.add(`${service}-db`)
    }
  }
  const failed = !entry.status || entry.status >= 500
  return { nodes, edges, failed, entry }
}

export default function FlowDiagram() {
  const log = useCommunicationLog()
  const latest = log[0]
  const [active, setActive] = useState(null)
  const showNodeServices = latest?.service === 'user' || latest?.service === 'payment'
  const nodes = showNodeServices ? NODE_GROUPS.user : NODE_GROUPS.enrollment
  const edges = showNodeServices ? NODE_EDGES : EDGES

  useEffect(() => {
    if (!latest) return undefined
    setActive(activeFor(latest))
    const timer = setTimeout(() => setActive(null), 1800)
    return () => clearTimeout(timer)
  }, [latest])

  const cls = (kind, key) =>
    active?.[kind].has(key) ? `active${active.failed ? ' failed' : ''}` : ''

  return (
    <figure className="flow">
      <svg viewBox="0 0 640 400" role="img" aria-label="Fluxo de comunicação entre os microsserviços">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrowhead" />
          </marker>
        </defs>

        <rect x="20" y="305" width="600" height="90" rx="12" className="mysql-box" />
        <text x="32" y="322" className="mysql-label">MySQL 8.4 · um banco por serviço</text>

        {Object.entries(edges).map(([key, [x1, y1, x2, y2]]) => (
          <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#arrow)" className={`edge ${cls('edges', key)}`} />
        ))}
        <text x="320" y="214" textAnchor="middle" className="edge-label">{showNodeServices ? 'valida usuário' : 'valida matrícula'}</text>

        {Object.entries(nodes).map(([key, n]) => (
          <g key={key} className={`node ${n.db ? 'db' : ''} ${cls('nodes', key)}`}>
            <rect x={n.x} y={n.y} width={n.w} height={NODE_H} rx={n.db ? 8 : 10} />
            <text x={n.x + n.w / 2} y={n.y + 22} textAnchor="middle" className="node-title">{n.title}</text>
            <text x={n.x + n.w / 2} y={n.y + 40} textAnchor="middle" className="node-sub">{n.sub}</text>
          </g>
        ))}
      </svg>
      <figcaption>
        {latest ? (
          <>
            Última requisição: <code>{latest.method} {latest.path}</code> → {latest.status ?? 'sem resposta'}
            {latest.upstream.some((call) => call.service === 'enrollment-service') && ' · o Attendance chamou o Enrollment'}
            {latest.upstream.some((call) => call.service === 'user-service') && ' · o Payment chamou o User'}
          </>
        ) : (
          'Faça uma ação em qualquer aba para ver o caminho da requisição.'
        )}
      </figcaption>
    </figure>
  )
}
