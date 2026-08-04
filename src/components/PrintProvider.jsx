import { createContext, useContext, useState, useCallback, useRef } from 'react'
import ReceiptDocument from './ReceiptDocument'

const PrintContext = createContext(() => {})

// Provides printReceipt(receipt): renders the receipt into a print-only area
// and opens the browser print dialog (where the user can "Save as PDF").
export function PrintProvider({ children }) {
  const [printData, setPrintData] = useState(null)
  const resetRef = useRef(null)

  const printReceipt = useCallback((receipt) => {
    setPrintData(receipt)
    // Wait a tick so the DOM updates before printing.
    window.clearTimeout(resetRef.current)
    window.setTimeout(() => {
      window.print()
      // Clear shortly after the dialog is dismissed.
      resetRef.current = window.setTimeout(() => setPrintData(null), 500)
    }, 60)
  }, [])

  return (
    <PrintContext.Provider value={printReceipt}>
      {children}
      {printData && (
        <div className="print-area" aria-hidden="true">
          <ReceiptDocument receipt={printData} />
        </div>
      )}
    </PrintContext.Provider>
  )
}

export function usePrint() {
  return useContext(PrintContext)
}
