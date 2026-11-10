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

const PdfContext = createContext({
  downloadReceipt: () => {},
  downloadReceipts: () => {},
  busy: false,
})

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

// Renders receipts to a real PDF file and triggers a download — no browser
// print dialog. Receipts are drawn off-screen, captured to a canvas, then
// placed onto A4 pages. Each receipt starts on its own page (and paginates if
// it is ever taller than one page).
export function PdfProvider({ children }) {
  const [renderList, setRenderList] = useState(null)
  const containerRef = useRef(null)
  const pending = useRef(null)
  const [busy, setBusy] = useState(false)

  // Download several receipts as ONE combined PDF (one receipt per page).
  const downloadReceipts = useCallback((receipts, fileName) => {
    return new Promise((resolve) => {
      if (!receipts || !receipts.length) return resolve()
      setBusy(true)
      pending.current = { receipts, fileName, resolve }
      setRenderList(receipts)
    })
  }, [])

  const downloadReceipt = useCallback(
    (receipt) => downloadReceipts([receipt]),
    [downloadReceipts]
  )

  useEffect(() => {
    if (!renderList || !containerRef.current || !pending.current) return
    const { receipts, fileName, resolve } = pending.current

    const run = async () => {
      const els = Array.from(containerRef.current.querySelectorAll('.receipt-doc'))
      try {
        await Promise.all(els.map(waitForImages))
        // Small delay to let fonts/layout settle.
        await new Promise((r) => setTimeout(r, 60))

        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()

        for (let i = 0; i < els.length; i++) {
          const el = els[i]
          const canvas = await html2canvas(el, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            windowWidth: el.scrollWidth,
          })
          const imgW = pageW
          const imgH = (canvas.height * imgW) / canvas.width
          const imgData = canvas.toDataURL('image/png')

          if (i > 0) pdf.addPage()
          let heightLeft = imgH
          let position = 0
          pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH, undefined, 'FAST')
          // Ignore sub-point rounding so a full-page receipt stays one page.
          heightLeft -= pageH + 2
          while (heightLeft > 0) {
            position -= pageH
            pdf.addPage()
            pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH, undefined, 'FAST')
            heightLeft -= pageH
          }
        }

        let name = fileName
        if (!name) {
          const first = receipts[0]
          const safeNum = (first.receiptNumber || 'receipt').replace(/[^\w-]/g, '')
          name =
            receipts.length === 1
              ? `Receipt-${safeNum}.pdf`
              : `Receipts-${safeNum}-and-${receipts.length - 1}-more.pdf`
        }
        pdf.save(name)
      } catch (err) {
        // Fall back to the print dialog if canvas capture fails for any reason.
        // eslint-disable-next-line no-console
        console.error('PDF generation failed, falling back to print:', err)
        window.print()
      } finally {
        pending.current = null
        setRenderList(null)
        setBusy(false)
        resolve()
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderList])

  return (
    <PdfContext.Provider value={{ downloadReceipt, downloadReceipts, busy }}>
      {children}
      {renderList && (
        <div className="pdf-render-area" ref={containerRef} aria-hidden="true">
          {renderList.map((r, i) => (
            <ReceiptDocument receipt={r} key={r.id || i} />
          ))}
        </div>
      )}
    </PdfContext.Provider>
  )
}

export function usePdf() {
  return useContext(PdfContext)
}
