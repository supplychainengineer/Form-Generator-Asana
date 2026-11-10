// Decides how many payment rows fit cleanly on a single one-page receipt and
// splits receipts that have more rows into several "parts" (Part 1 of 2,
// Part 2 of 2, ...) so every receipt stays on one tidy A4 page.
//
// Instead of guessing, the receipt is actually rendered off-screen at the
// 800px width used for PDFs and measured, so long names, addresses, wrapped
// descriptions, logos, signatures and notes are all accounted for exactly.

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReceiptView } from '../components/ReceiptDocument'

const PAGE_HEIGHT = 1131 // A4 at 800px wide
const SAFETY_MARGIN = 8 // small allowance for font/rounding differences

let measureHost = null

function host() {
  if (!measureHost) {
    measureHost = document.createElement('div')
    measureHost.className = 'pdf-render-area receipt-measure'
    measureHost.setAttribute('aria-hidden', 'true')
    document.body.appendChild(measureHost)
  }
  return measureHost
}

// Render `receipt` and return { fixed, rows } where `rows` are the heights of
// each payment row and `fixed` is the height of everything else.
function measure(receipt, settings) {
  const el = host()
  // Fill in placeholders so the measured layout matches the final receipt
  // even if the number/date haven't been assigned yet.
  const sample = {
    ...receipt,
    receiptNumber: receipt.receiptNumber || 'RCP-000000-0000',
    receiptDate: receipt.receiptDate || '2000-12-31',
  }
  el.innerHTML = renderToStaticMarkup(createElement(ReceiptView, { receipt: sample, settings }))
  const doc = el.querySelector('.receipt-doc')
  doc.style.minHeight = '0'
  // Images may not have loaded yet; assume the widest logo (most wrapping).
  doc.querySelectorAll('.r-logo img').forEach((img) => {
    img.style.width = '130px'
  })
  const total = doc.getBoundingClientRect().height
  // Payment table is the last .r-table; its body rows minus the total row.
  const tables = doc.querySelectorAll('.r-table')
  const payTable = tables[tables.length - 1]
  const trs = Array.from(payTable.querySelectorAll('tbody tr')).filter(
    (tr) => !tr.classList.contains('r-total-row')
  )
  const rows = trs.map((tr) => tr.getBoundingClientRect().height)
  const fixed = total - rows.reduce((a, b) => a + b, 0)
  el.innerHTML = ''
  return { fixed, rows }
}

// Group payments into chunks that each fit on one page.
export function chunkPayments(receipt, settings) {
  const payments = receipt.payments || []
  if (typeof document === 'undefined' || payments.length <= 1) return [payments]

  const single = measure({ ...receipt, part: undefined, partCount: undefined }, settings)
  const sum = single.rows.reduce((a, b) => a + b, 0)
  if (single.fixed + sum <= PAGE_HEIGHT - SAFETY_MARGIN) return [payments]

  // Split receipts also show "Part x of y" in the header — measure with it.
  const parted = measure({ ...receipt, part: 1, partCount: 2 }, settings)
  const budget = PAGE_HEIGHT - SAFETY_MARGIN - parted.fixed
  const chunks = []
  let cur = []
  let used = 0
  payments.forEach((p, i) => {
    const h = parted.rows[i]
    if (cur.length && used + h > budget) {
      chunks.push(cur)
      cur = []
      used = 0
    }
    cur.push(p)
    used += h
  })
  if (cur.length) chunks.push(cur)

  // Even out the parts (e.g. 6 + 6 rather than 11 + 1) when that still fits.
  const n = chunks.length
  const balanced = []
  let start = 0
  for (let k = 0; k < n; k++) {
    const size = Math.ceil((payments.length - start) / (n - k))
    balanced.push({ start, end: start + size })
    start += size
  }
  const fits = balanced.every(
    ({ start: a, end: b }) => parted.rows.slice(a, b).reduce((x, y) => x + y, 0) <= budget
  )
  return fits ? balanced.map(({ start: a, end: b }) => payments.slice(a, b)) : chunks
}

// Split a receipt into one or more one-page receipts. Each part gets its own
// receipt number from `numberFor(index)` (part 1 keeps the original id when
// present) and records which part it is.
export function splitReceipt(receipt, settings, numberFor) {
  const chunks = chunkPayments(receipt, settings)
  if (chunks.length === 1) return [receipt]
  const groupId = receipt.splitGroup || crypto.randomUUID()
  return chunks.map((payments, i) => ({
    ...receipt,
    id: i === 0 && receipt.id ? receipt.id : crypto.randomUUID(),
    receiptNumber: numberFor(i),
    payments,
    splitGroup: groupId,
    part: i + 1,
    partCount: chunks.length,
  }))
}
