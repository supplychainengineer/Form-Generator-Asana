// Reads a patient account statement PDF (text-based, as exported by practice
// management software) and pulls out the payments received.
//
// Statements differ between systems, so parsing is heuristic: every text line
// that has a date and a dollar amount is a candidate transaction, and keywords
// in the line decide whether it is a patient payment, an insurance payment, or
// something else (charges, adjustments, balances...). The import screen lets
// the user review and correct everything before receipts are generated.

import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// ---------------------------------------------------------------- text lines

// Returns the PDF's text as lines, top-to-bottom, each made of the text pieces
// on that line left-to-right. Large horizontal gaps become "   " so columns
// stay distinguishable.
export async function extractLines(file) {
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const lines = []
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo)
    const content = await page.getTextContent()
    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        w: it.width,
        h: Math.abs(it.transform[3]) || 10,
      }))
    // Group by baseline (top to bottom), tolerant of tiny offsets.
    items.sort((a, b) => b.y - a.y || a.x - b.x)
    const rows = []
    for (const it of items) {
      const row = rows.find((r) => Math.abs(r.y - it.y) <= Math.max(2, it.h * 0.35))
      if (row) row.items.push(it)
      else rows.push({ y: it.y, items: [it] })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x)
      let text = ''
      let prevEnd = null
      for (const it of r.items) {
        if (prevEnd != null) {
          const gap = it.x - prevEnd
          if (gap > it.h * 1.2) text += '   '
          else if (gap > it.h * 0.15 && !text.endsWith(' ') && !it.str.startsWith(' '))
            text += ' '
        }
        text += it.str
        prevEnd = it.x + it.w
      }
      const t = text.replace(/\s+$/, '')
      if (t.trim()) lines.push({ text: t, page: pageNo })
    }
  }
  return lines
}

// --------------------------------------------------------------------- dates

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

const DATE_PATTERNS = [
  // 2026-01-15
  {
    re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
    get: (m) => [+m[1], +m[2], +m[3]],
  },
  // 01/15/2026, 1/15/26, 01-15-2026, 01.15.2026
  {
    re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/,
    get: (m) => [m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]],
  },
  // Jan 15, 2026 / January 15 2026
  {
    re: /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
    get: (m) => [+m[3], MONTHS[m[1].toLowerCase()], +m[2]],
  },
  // 15 Jan 2026
  {
    re: /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/i,
    get: (m) => [+m[3], MONTHS[m[2].toLowerCase()], +m[1]],
  },
]

function toISO(y, m, d) {
  if (!y || !m || !d || m > 12 || d > 31 || y < 1990 || y > 2100) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Finds the first date in `text`. Returns { iso, index, length } or null.
export function findDate(text) {
  let best = null
  for (const p of DATE_PATTERNS) {
    const m = p.re.exec(text)
    if (!m) continue
    const iso = toISO(...p.get(m))
    if (iso && (!best || m.index < best.index)) {
      best = { iso, index: m.index, length: m[0].length }
    }
  }
  return best
}

// ------------------------------------------------------------------- amounts

// $1,234.56   (1,234.56)   -1,234.56   1,234.56-   1,234.56 CR
const AMOUNT_RE = /(\()?(-)?\s?\$?\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)(\))?(-)?(\s?CR\b)?/gi

function findAmounts(text) {
  const out = []
  AMOUNT_RE.lastIndex = 0
  let m
  while ((m = AMOUNT_RE.exec(text))) {
    // Skip numbers glued to letters/digits (ids, phone numbers, dates).
    const before = text[m.index - 1]
    if (before && /[\w/.]/.test(before) && !m[1] && !m[2]) continue
    const value = parseFloat(`${m[3].replace(/,/g, '')}.${m[4]}`)
    const negative = !!(m[1] && m[5]) || !!m[2] || !!m[6] || !!m[7]
    out.push({ value, negative, index: m.index, raw: m[0] })
  }
  return out
}

// ---------------------------------------------------------- classification

const SUMMARY_RE =
  /\b(total|totals|subtotal|summary|last payment|next payment|payment due|amount due|due date|minimum due|balance|previous|beginning|ending|aging|current period|this period|statement date|past due|estimated|pending|scheduled|contract amount|monthly payment amount)\b/i
const INSURANCE_RE =
  /\b(insurance|ins\.?|ins pmt|primary|secondary|claim|eob|delta|aetna|cigna|metlife|guardian|concordia|bcbs|blue\s?cross|blue\s?shield|humana|anthem|united\s?healthcare|uhc|principal|ameritas|geha|sun\s?life|lincoln)\b/i
const OTHER_RE =
  /\b(charge|charges|fee|adjust|adjustment|adj|write[- ]?off|refund|reversal|reversed|returned|nsf|finance|interest|late|discount|courtesy|transfer|void|voided|billing|bill)\b/i
const CHARGE_RE = /\b(charge|charges|charged|billed|invoice|late fee|finance charge)\b/i
const PAYMENT_RE =
  /\b(pay|payment|payments|pymt|pmt|paid|receipt|received|check|chk|cheque|cash|visa|master\s?card|mc|amex|american express|discover|credit card|debit|card|cc|ach|eft|auto[- ]?pay|autopay|auto draft|online|portal|carecredit|care credit|zelle|venmo|paypal|hsa|fsa|money order)\b/i

function classify(desc) {
  if (SUMMARY_RE.test(desc)) return 'other'
  if (INSURANCE_RE.test(desc)) return 'insurance'
  if (CHARGE_RE.test(desc)) return 'other'
  // A charge line that merely mentions "card" etc. is still a charge,
  // e.g. "Late fee". But "Payment - thank you" is a payment.
  if (PAYMENT_RE.test(desc) && !/\b(refund|reversal|reversed|returned|nsf|void)\b/i.test(desc))
    return 'payment'
  if (OTHER_RE.test(desc)) return 'other'
  return 'other'
}

// ----------------------------------------------------- patient / guarantor

const LABEL_PATTERNS = [
  { key: 'patientName', re: /\bpatient(?:\s+name)?\s*[:#-]\s*(.+)$/i },
  { key: 'responsibleName', re: /\b(?:guarantor|responsible\s+party|account\s+holder|policy\s+holder|bill\s+to)(?:\s+name)?\s*[:#-]\s*(.+)$/i },
]

function cleanName(raw) {
  // Value ends at the next column gap or at the next "Label:".
  let v = raw.split(/\s{3,}/)[0]
  v = v.replace(
    /\s+(?:guarantor|responsible\s+party|account|acct|dob|date\s+of\s+birth|chart|patient|phone|statement|provider|doctor|id)\b.*$/i,
    ''
  )
  v = v.trim().replace(/[,;:-]+$/, '').trim()
  if (!v || /\d{3,}/.test(v) || v.length > 60) return ''
  // "DOE, JOHN" -> "John Doe"
  if (/^[A-Za-z'.-]+,\s*[A-Za-z'. -]+$/.test(v)) {
    const [last, first] = v.split(',').map((s) => s.trim())
    v = `${first} ${last}`
  }
  if (v === v.toUpperCase()) {
    v = v.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase())
  }
  return v
}

// --------------------------------------------------------------------- parse

// Turns extracted lines into { patientName, responsibleName, transactions }.
// Each transaction: { date, description, amount, kind, patient, page, raw }.
export function parseLines(lines) {
  const result = { patientName: '', responsibleName: '', transactions: [] }
  let currentPatient = ''

  for (const { text, page } of lines) {
    // Patient / guarantor labels (may appear several times on family statements).
    for (const { key, re } of LABEL_PATTERNS) {
      const m = re.exec(text)
      if (m) {
        const name = cleanName(m[1])
        if (name) {
          if (key === 'patientName') currentPatient = name
          if (!result[key]) result[key] = name
        }
      }
    }

    const date = findDate(text)
    if (!date) continue
    const afterDate = text.slice(date.index + date.length)
    const amounts = findAmounts(afterDate)
    if (!amounts.length) continue

    // Description: text between the date and the first amount, without any
    // further dates (e.g. a separate "posted" date column).
    let desc = afterDate.slice(0, amounts[0].index)
    let extra
    while ((extra = findDate(desc))) {
      desc = desc.slice(0, extra.index) + ' ' + desc.slice(extra.index + extra.length)
    }
    desc = desc.replace(/\s+/g, ' ').replace(/^[\s\-–|:]+|[\s\-–|:$]+$/g, '').trim()
    // Some layouts put the description before the date.
    if (!desc) {
      desc = text.slice(0, date.index).replace(/\s+/g, ' ').trim()
    }
    if (!desc) continue

    // The first amount is the transaction; later ones are usually running
    // balances. Payments may be shown negative/credit — use the magnitude.
    const amount = amounts[0].value
    if (!(amount > 0)) continue

    result.transactions.push({
      date: date.iso,
      description: desc,
      amount,
      kind: classify(desc),
      patient: currentPatient,
      page,
      raw: text.replace(/\s+/g, ' ').trim(),
    })
  }
  return result
}

export async function parseStatement(file) {
  const lines = await extractLines(file)
  const parsed = parseLines(lines)
  return { ...parsed, fileName: file.name, lineCount: lines.length }
}
