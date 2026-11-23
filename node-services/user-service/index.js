import { HttpError, start, validId } from '../server.js'

await start({
  database: 'user_db',
  port: 8003,
  schema: `
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  routes(app, db) {
    app.post('/users', async (req, res) => {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
      if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, 'Informe um nome de até 100 caracteres e um e-mail válido.')
      }

      try {
        const [result] = await db.execute('INSERT INTO users (name, email) VALUES (?, ?)', [name, email])
        res.status(201).json({ id: result.insertId, name, email })
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'E-mail já cadastrado.')
        throw error
      }
    })

    app.get('/users/:id', async (req, res) => {
      if (!validId(req.params.id)) throw new HttpError(400, 'ID de usuário inválido.')
      const [[user]] = await db.execute('SELECT id, name FROM users WHERE id = ?', [req.params.id])
      if (!user) throw new HttpError(404, 'Usuário não encontrado.')
      res.json(user)
    })
  },
})
