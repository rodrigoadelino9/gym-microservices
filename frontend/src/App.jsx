import { useState } from 'react'
import CommunicationLog from './components/CommunicationLog.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import Overview from './pages/Overview.jsx'
import SchedulePage from './pages/SchedulePage.jsx'
import PaymentsPage from './pages/PaymentsPage.jsx'
import StudentsPage from './pages/StudentsPage.jsx'

const TABS = [
  { id: 'overview', label: 'Visão geral', component: Overview },
  { id: 'students', label: 'Alunos', component: StudentsPage },
  { id: 'attendance', label: 'Frequência', component: AttendancePage },
  { id: 'schedule', label: 'Agenda', component: SchedulePage },
  { id: 'payments', label: 'Pagamentos', component: PaymentsPage },
  { id: 'history', label: 'Histórico', component: HistoryPage },
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const Page = TABS.find((t) => t.id === tab).component

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">G</span>
          <div>
            <strong>GYM</strong>
            <span className="muted small"> · microsserviços</span>
          </div>
        </div>
        <nav className="tabs" aria-label="Seções">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="layout">
        <main>
          <Page />
        </main>
        <CommunicationLog />
      </div>
    </div>
  )
}
