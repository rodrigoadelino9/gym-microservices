const services = {
  user: { env: 'USER_URL', resource: 'users' },
  payment: { env: 'PAYMENT_URL', resource: 'payments' },
}

async function forward(request) {
  const { pathname, searchParams } = new URL(request.url)
  const original = /^\/api\/(user|payment)\/(.+)$/.exec(pathname)
  const service = original ? original[1] : searchParams.get('service')
  const route = original ? original[2] : searchParams.get('route')
  const config = Object.hasOwn(services, service) && services[service]
  if (!config || !route) {
    return Response.json({ detail: 'Rota inexistente.' }, { status: 404 })
  }

  const { resource, env } = config
  const item = new RegExp('^' + resource + '/[1-9][0-9]{0,9}$')
  const isRead = request.method === 'GET' && (route === 'health' || item.test(route))
  const isCreate = request.method === 'POST' && route === resource
  if (!isRead && !isCreate) return Response.json({ detail: 'Rota inexistente.' }, { status: 404 })

  if (!process.env[env]) {
    return Response.json({ detail: 'Serviço ainda sem endereço configurado no gateway.' }, { status: 503 })
  }

  try {
    const headers = new Headers()
    let body
    if (isCreate) {
      headers.set('Content-Type', 'application/json')
      const key = request.headers.get('Idempotency-Key')
      if (key) headers.set('Idempotency-Key', key)
      body = await request.text()
      if (Buffer.byteLength(body) > 8192) {
        return Response.json({ detail: 'Corpo da requisição muito grande.' }, { status: 413 })
      }
    }
    const response = await fetch(new URL('/' + route, process.env[env]), {
      method: request.method,
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    })
    const forwarded = new Headers({ 'Cache-Control': 'no-store' })
    for (const name of ['Content-Type', 'X-Upstream-Calls']) {
      const value = response.headers.get(name)
      if (value) forwarded.set(name, value)
    }
    return new Response(response.body, { status: response.status, headers: forwarded })
  } catch {
    return Response.json({ detail: 'Serviço indisponível no gateway.' }, { status: 502 })
  }
}

export { forward as GET, forward as POST }
