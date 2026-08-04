import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { ToastProvider } from './components/Toast'
import { PrintProvider } from './components/PrintProvider'
import Dashboard from './pages/Dashboard'
import NewReceipt from './pages/NewReceipt'
import ReceiptHistory from './pages/ReceiptHistory'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ToastProvider>
      <PrintProvider>
        <div className="app-shell">
          <Sidebar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<NewReceipt />} />
              <Route path="/history" element={<ReceiptHistory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </PrintProvider>
    </ToastProvider>
  )
}
