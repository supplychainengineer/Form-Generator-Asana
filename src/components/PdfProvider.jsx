import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import ReceiptDocument from './ReceiptDocument'

const PdfContext = createContext({ downloadReceipt: () => {}, busy: false })

// Wait until every <img> inside `el` has finished loading (data URLs usually
// resolve synchronously, but be safe so the canvas capture isn't blank).
function waitForImages(el) {
  const imgs = Array.from(el.querySelectorAll('img'))
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = img.onerror = () => res()
          })
    )
  )
}

// Renders a receipt to a real PDF file and triggers a download — no browser
// print dialog. The receipt is drawn off-screen, captured to a canvas, then
// placed onto A4 pages (paginating if it's taller than one page).
export function PdfProvider({ children }) {
  const [renderData, setRenderData] = useState(null)
  const containerRef = useRef(null)
  const pending = useRef(null)
  const [busy, setBusy] = useState(false)

  const downloadReceipt = useCallback((receipt) => {
    return new Promise((resolve) => {
      setBusy(true)
      pending.current = { receipt, resolve }
      setRenderData(receipt)
    })
  }, [])

  useEffect(() => {
    if (!renderData || !containerRef.current || !pending.current) return
    const { receipt, resolve } = pending.current

    const run = async () => {
      const el = containerRef.current.querySelector('.receipt-doc')
      try {
        await waitForImages(el)
        // Small delay to let fonts/layout settle.
        await new Promise((r) => setTimeout(r, 60))

        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: el.scrollWidth,
        })

        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const imgW = pageW
        const imgH = (canvas.height * imgW) / canvas.width
        const imgData = canvas.toDataURL('image/png')

        let heightLeft = imgH
        let position = 0
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH, undefined, 'FAST')
        heightLeft -= pageH
        while (heightLeft > 0) {
          position -= pageH
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH, undefined, 'FAST')
          heightLeft -= pageH
        }

        const safeNum = (receipt.receiptNumber || 'receipt').replace(/[^\w-]/g, '')
        pdf.save(`Receipt-${safeNum}.pdf`)
      } catch (err) {
        // Fall back to the print dialog if canvas capture fails for any reason.
        // eslint-disable-next-line no-console
        console.error('PDF generation failed, falling back to print:', err)
        window.print()
      } finally {
        pending.current = null
        setRenderData(null)
        setBusy(false)
        resolve()
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderData])

  return (
    <PdfContext.Provider value={{ downloadReceipt, busy }}>
      {children}
      {renderData && (
        <div className="pdf-render-area" ref={containerRef} aria-hidden="true">
          <ReceiptDocument receipt={renderData} />
        </div>
      )}
    </PdfContext.Provider>
  )
}

export function usePdf() {
  return useContext(PdfContext)
}
