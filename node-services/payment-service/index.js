import { performance } from 'node:perf_hooks'
import { HttpError, start, validId } from '../server.js'

const userServiceUrl = new URL(process.env.USER_SERVICE_URL || 'http://localhost:8003')
if (!['http:', 'https:'].includes(userServiceUrl.protocol)) {
  throw new Error('USER_SERVICE_URL deve usar HTTP ou HTTPS.')
}

async function validateUser(id, res) {
  const path = '/users/' + id
  const started = performance.now()
  let status = null
  try {
    const response = await fetch(new URL(path, userServiceUrl), {
      signal: AbortSignal.timeout(4000),
      redirect: 'error',
    })
    status = response.status
    await response.body?.cancel()
  } catch {
    throw new HttpError(503, 'Serviço de usuários indisponível. Tente novamente.')
  } finally {
    res.set('X-Upstream-Calls', JSON.stringify([{
      service: 'user-service', method: 'GET', path, status, ms: Math.round(performance.now() - started),
    }]))
  }

  if (status === 404) throw new HttpError(404, 'Usuário não encontrado. Pagamento não registrado.')
  if (status !== 200) throw new HttpError(503, 'Serviço de usuários indisponível. Tente novamente.')
}

function replayPayment(res, payment, userId, amountCents) {
  if (payment.user_id !== userId || payment.amount_cents !== amountCents) {
    throw new HttpError(409, 'Esta chave já foi usada para outro pagamento.')
  }
  res.status(200).json(payment)
}

await start({
  database: 'payment_db',
  port: 8004,
  schema: `
    CREATE TABLE IF NOT EXISTS payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      amount_cents INT UNSIGNED NOT NULL,
      status ENUM('simulado') NOT NULL DEFAULT 'simulado',
      request_key CHAR(36) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  routes(app, db) {
    const paymentFields = 'id, user_id, amount_cents, status'
    async function findByKey(key) {
      const [[payment]] = await db.execute(
        'SELECT ' + paymentFields + ' FROM payments WHERE request_key = ?', [key],
      )
      return payment
    }

    app.post('/payments', async (req, res) => {
      const { user_id: userId, amount_cents: amountCents } = req.body || {}
      const key = req.get('Idempotency-Key')?.toLowerCase()
      if (!Number.isInteger(userId) || !validId(userId) ||
          !Number.isInteger(amountCents) || amountCents < 1 || amountCents > 99999999) {
        throw new HttpError(400, 'Informe um ID de usuário e um valor de R$ 0,01 a R$ 999.999,99 em centavos.')
      }
      if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key)) {
        throw new HttpError(400, 'Envie um UUID v4 no cabeçalho Idempotency-Key.')
      }

      const existing = await findByKey(key)
      if (existing) return replayPayment(res, existing, userId, amountCents)

      await validateUser(userId, res)
      try {
        const [result] = await db.execute(
          'INSERT INTO payments (user_id, amount_cents, request_key) VALUES (?, ?, ?)',
          [userId, amountCents, key],
        )
        res.status(201).json({ id: result.insertId, user_id: userId, amount_cents: amountCents, status: 'simulado' })
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error
        replayPayment(res, await findByKey(key), userId, amountCents)
      }
    })

    app.get('/payments/:id', async (req, res) => {
      if (!validId(req.params.id)) throw new HttpError(400, 'ID de pagamento inválido.')
      const [[payment]] = await db.execute(
        'SELECT ' + paymentFields + ' FROM payments WHERE id = ?', [req.params.id],
      )
      if (!payment) throw new HttpError(404, 'Pagamento não encontrado.')
      res.json(payment)
    })
  },
})
