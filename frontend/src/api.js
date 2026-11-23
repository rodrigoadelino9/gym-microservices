import { useSyncExternalStore } from 'react'

// Registro dos microsserviços acessados via API Gateway.
// Para integrar os serviços das outras equipes, basta adicionar aqui
// e criar a rota correspondente no gateway (vite.config.js / vercel.json / nginx).
export const SERVICES = {
  user: { name: 'User Service', base: '/api/user', lang: 'JavaScript · Node.js' },
  payment: { name: 'Payment Service', base: '/api/payment', lang: 'JavaScript · Node.js' },
  enrollment: { name: 'Enrollment Service', base: '/api/enrollment', lang: 'Python · FastAPI' },
  attendance: { name: 'Attendance Service', base: '/api/attendance', lang: 'Python · FastAPI' },
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// ---------- Log de comunicação (store simples) ----------
let log = []
let nextId = 1
const listeners = new Set()

function push(entry) {
  log = [entry, ...log].slice(0, 100)
  listeners.forEach((fn) => fn())
}

export function clearLog() {
  log = []
  listeners.forEach((fn) => fn())
}

export function useCommunicationLog() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => log,
  )
}

function errorMessage(data, status) {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.slice(1).join('.') || 'campo'}: ${d.msg}`).join('; ')
  }
  return `Erro HTTP ${status}`
}

function parseUpstream(header) {
  if (!header) return []
  try {
    return JSON.parse(header)
  } catch {
    return []
  }
}

// ---------- Cliente HTTP ----------
export async function request(service, method, path, body, { silent = false, idempotencyKey } = {}) {
  const url = SERVICES[service].base + path
  const started = performance.now()
  let response
  let data = null

  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await response.text()
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
  } catch (err) {
    if (!silent) {
      push({ id: nextId++, at: new Date(), service, method, path, status: null, ms: 0, upstream: [] })
    }
    throw new ApiError(`Não foi possível contactar o ${SERVICES[service].name}`, null)
  }

  if (!silent) {
    push({
      id: nextId++,
      at: new Date(),
      service,
      method,
      path,
      status: response.status,
      ms: Math.round(performance.now() - started),
      upstream: parseUpstream(response.headers.get('X-Upstream-Calls')),
    })
  }

  if (response.ok && ['user', 'payment'].includes(service) && data === null) {
    throw new ApiError('O gateway retornou uma resposta inesperada.', response.status)
  }

  if (!response.ok) {
    if (response.status >= 502 && data === null) {
      throw new ApiError(`${SERVICES[service].name} indisponível (gateway ${response.status})`, response.status)
    }
    throw new ApiError(errorMessage(data, response.status), response.status)
  }
  return data
}

export const enrollmentApi = {
  listStudents: () => request('enrollment', 'GET', '/students'),
  createStudent: (body) => request('enrollment', 'POST', '/students', body),
  deleteStudent: (id) => request('enrollment', 'DELETE', `/students/${id}`),
  enrollmentStatus: (id) => request('enrollment', 'GET', `/students/${id}/enrollment-status`),
  listEnrollments: (id) => request('enrollment', 'GET', `/students/${id}/enrollments`),
  createEnrollment: (id, body) => request('enrollment', 'POST', `/students/${id}/enrollments`, body),
  setEnrollmentStatus: (enrollmentId, status) =>
    request('enrollment', 'PATCH', `/enrollments/${enrollmentId}/status`, { status }),
  listAssessments: (id) => request('enrollment', 'GET', `/students/${id}/assessments`),
  createAssessment: (id, body) => request('enrollment', 'POST', `/students/${id}/assessments`, body),
}

export const attendanceApi = {
  listCheckins: (params = '') => request('attendance', 'GET', `/checkins${params}`),
  checkIn: (body) => request('attendance', 'POST', '/checkins', body),
  checkOut: (id) => request('attendance', 'PATCH', `/checkins/${id}/checkout`),
  listAppointments: (params = '') => request('attendance', 'GET', `/appointments${params}`),
  createAppointment: (body) => request('attendance', 'POST', '/appointments', body),
  setAppointmentStatus: (id, status) =>
    request('attendance', 'PATCH', `/appointments/${id}/status`, { status }),
  summary: (id, days = 30) => request('attendance', 'GET', `/students/${id}/attendance-summary?days=${days}`),
  history: (id) => request('attendance', 'GET', `/students/${id}/history`),
}

export const userApi = {
  create: (body) => request('user', 'POST', '/users', body),
}

export const paymentApi = {
  create: (body, idempotencyKey) => request('payment', 'POST', '/payments', body, { idempotencyKey }),
  find: (id) => request('payment', 'GET', '/payments/' + id),
}

export function health(service) {
  return request(service, 'GET', '/health', null, { silent: true })
}
