import { useRef, useState } from 'react'
import { paymentApi, userApi } from '../api.js'
import { Alert, useFeedback } from '../components/ui.jsx'

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function PaymentsPage() {
  const [userId, setUserId] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [user, setUser] = useState(null)
  const [payment, setPayment] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, act, setFeedback] = useFeedback()
  const pending = useRef(null)

  async function submit(event, action, successText) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await act(() => action(fields), successText)
    } finally {
      setBusy(false)
    }
  }

  async function createUser(fields) {
    const record = await userApi.create({ name: fields.get('name'), email: fields.get('email') })
    setUser(record)
    setUserId(record.id)
  }

  async function createPayment(fields) {
    const amount = String(fields.get('amount')).replace(',', '.')
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(amount)) {
      throw new Error('Informe um valor em reais com até duas casas decimais.')
    }
    const [whole, fraction = ''] = amount.split('.')
    const body = { user_id: Number(userId), amount_cents: Number(whole) * 100 + Number(fraction.padEnd(2, '0')) }
    const fingerprint = JSON.stringify(body)
    // Uma resposta perdida pode ser repetida com a mesma chave.
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = { fingerprint, key: crypto.randomUUID() }
    }
    const record = await paymentApi.create(body, pending.current.key)
    pending.current = null
    setPayment(record)
    setPaymentId(record.id)
  }

  return (
    <>
      <h1>Usuários e pagamentos</h1>
      <p className="muted">O Payment consulta o User antes de registrar um pagamento simulado.</p>
      <Alert feedback={feedback} onClose={() => setFeedback(null)} />
      <div className="two-col">
        <section className="card">
          <h2>Cadastrar usuário</h2>
          <form onSubmit={(event) => submit(event, createUser, 'Usuário cadastrado.')}>
            <fieldset disabled={busy} className="form-grid">
              <label>Nome <input name="name" maxLength={100} required /></label>
              <label>E-mail <input name="email" type="email" maxLength={254} required /></label>
              <button type="submit">Cadastrar usuário</button>
            </fieldset>
          </form>
          {user && <p>Usuário #{user.id} · {user.name}</p>}
        </section>

        <section className="card">
          <h2>Registrar pagamento simulado</h2>
          <form onSubmit={(event) => submit(event, createPayment, 'Pagamento simulado registrado.')}>
            <fieldset disabled={busy} className="form-grid">
              <label>ID do usuário
                <input type="number" min="1" step="1" value={userId} onChange={(event) => setUserId(event.target.value)} required />
              </label>
              <label>Valor (R$)
                <input name="amount" inputMode="decimal" placeholder="49,90" required />
              </label>
              <button type="submit">Registrar pagamento</button>
            </fieldset>
          </form>
        </section>

        <section className="card">
          <h2>Consultar pagamento</h2>
          <form onSubmit={(event) => submit(event, async (fields) => {
            setPayment(null)
            setPayment(await paymentApi.find(fields.get('paymentId')))
          })}>
            <fieldset disabled={busy} className="form-grid">
              <label>ID do pagamento
                <input name="paymentId" type="number" min="1" step="1" value={paymentId} onChange={(event) => setPaymentId(event.target.value)} required />
              </label>
              <button type="submit">Consultar</button>
            </fieldset>
          </form>
          {payment && (
            <p>#{payment.id} · Usuário #{payment.user_id} · {reais.format(payment.amount_cents / 100)} · {payment.status}</p>
          )}
        </section>
      </div>
    </>
  )
}
