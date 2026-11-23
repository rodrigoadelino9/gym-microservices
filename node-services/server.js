import express from 'express'
import mysql from 'mysql2/promise'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function validId(value) {
  return /^[1-9]\d{0,9}$/.test(String(value)) && Number(value) <= 4294967295
}

export async function start({ database, port, schema, routes }) {
  const { DB_HOST, DB_PORT = '3306', DB_USER, DB_PASSWORD, DB_NAME = database, DB_SSL, PORT = port } = process.env
  if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
    throw new Error('Configure DB_HOST, DB_USER e DB_PASSWORD.')
  }

  const db = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: DB_SSL === 'true' ? {} : undefined,
    timezone: 'Z',
    connectTimeout: 5000,
    connectionLimit: 5,
    queueLimit: 50,
  })

  try {
    await db.query(schema)
  } catch (error) {
    await db.end()
    throw error
  }

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '8kb' }))
  app.get('/health', async (_req, res) => {
    try {
      await db.query('SELECT 1')
      res.json({ status: 'ok' })
    } catch {
      res.status(503).json({ detail: 'Banco de dados indisponível.' })
    }
  })

  routes(app, db)

  app.use((_req, res) => res.status(404).json({ detail: 'Rota inexistente.' }))
  app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ detail: error.message })
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ detail: 'JSON inválido.' })
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ detail: 'Corpo da requisição muito grande.' })
    }
    console.error('Falha na requisição:', error.code || error.name)
    return res.status(500).json({ detail: 'Erro interno do serviço.' })
  })

  const server = app.listen(Number(PORT), '0.0.0.0', () => console.log('Serviço HTTP na porta', PORT))
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(() => db.end()))
  }
}
