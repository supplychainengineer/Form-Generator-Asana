import { createContext, useContext, useCallback, useState } from 'react'
import { IconCheck } from './icons'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const notify = useCallback((message) => {
    setToast({ message, id: Date.now() })
    window.clearTimeout(notify._t)
    notify._t = window.setTimeout(() => setToast(null), 2600)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div className="toast success" key={toast.id}>
          <IconCheck />
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
