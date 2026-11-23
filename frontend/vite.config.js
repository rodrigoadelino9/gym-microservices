import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento o proxy do Vite faz o papel do API Gateway:
// /api/<servico>/... é encaminhado para o microsserviço correspondente.
const routes = {
  '/api/user': process.env.USER_URL || 'http://localhost:8003',
  '/api/payment': process.env.PAYMENT_URL || 'http://localhost:8004',
  '/api/enrollment': process.env.ENROLLMENT_URL || 'http://localhost:8001',
  '/api/attendance': process.env.ATTENDANCE_URL || 'http://localhost:8002',
}

const proxy = Object.fromEntries(
  Object.entries(routes).map(([prefix, target]) => [
    prefix,
    { target, changeOrigin: true, rewrite: (path) => path.replace(prefix, '') },
  ]),
)

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
})
