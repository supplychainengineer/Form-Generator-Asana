import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultSettings, sampleReceipts } from './defaults'

const SETTINGS_KEY = 'aoreceipts.settings.v1'
const RECEIPTS_KEY = 'aoreceipts.receipts.v1'
const SEEDED_KEY = 'aoreceipts.seeded.v1'

const StoreContext = createContext(null)

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...defaultSettings,
    ...load(SETTINGS_KEY, {}),
  }))

  const [receipts, setReceipts] = useState(() => {
    const existing = load(RECEIPTS_KEY, null)
    if (existing) return existing
    // First run: seed sample receipts once (only if the user never had data).
    const wasSeeded = load(SEEDED_KEY, false)
    if (!wasSeeded) return sampleReceipts
    return []
  })

  // Persist
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts))
    localStorage.setItem(SEEDED_KEY, JSON.stringify(true))
  }, [receipts])

  const updateSettings = (patch) => setSettings((s) => ({ ...s, ...patch }))

  // Highest sequence across all receipts (global running counter).
  const maxSequence = () => {
    let maxSeq = 0
    for (const r of receipts) {
      const m = /-(\d+)$/.exec(r.receiptNumber || '')
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))
    }
    return maxSeq
  }

  const formatNumber = (dateStr, seqNum) => {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    const seq = String(seqNum).padStart(4, '0')
    const prefix = (settings.receiptPrefix || 'RCP').trim() || 'RCP'
    return `${prefix}-${ym}-${seq}`
  }

  const nextReceiptNumber = (dateStr) => formatNumber(dateStr, maxSequence() + 1)

  // Reserve `count` consecutive numbers at once (for batch generation, before
  // any of them are saved). `offset` skips numbers already handed out.
  const nextReceiptNumbers = (dateStrs, offset = 0) => {
    const start = maxSequence() + 1 + offset
    return dateStrs.map((d, i) => formatNumber(d, start + i))
  }

  const saveReceipt = (receipt) => {
    setReceipts((list) => {
      const idx = list.findIndex((r) => r.id === receipt.id)
      if (idx >= 0) {
        const copy = [...list]
        copy[idx] = receipt
        return copy
      }
      return [receipt, ...list]
    })
  }

  // Save several receipts in one update (used by statement import / splits).
  const saveReceipts = (list) => {
    setReceipts((current) => {
      const next = [...current]
      for (const receipt of list) {
        const idx = next.findIndex((r) => r.id === receipt.id)
        if (idx >= 0) next[idx] = receipt
        else next.unshift(receipt)
      }
      return next
    })
  }

  const deleteReceipt = (id) => {
    setReceipts((list) => list.filter((r) => r.id !== id))
  }

  const getReceipt = (id) => receipts.find((r) => r.id === id)

  const receiptTotal = (r) =>
    (r.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  // Sorted newest first for display
  const sortedReceipts = useMemo(
    () =>
      [...receipts].sort((a, b) => {
        const da = a.receiptDate || a.createdAt || ''
        const db = b.receiptDate || b.createdAt || ''
        if (db !== da) return db.localeCompare(da)
        return (b.receiptNumber || '').localeCompare(a.receiptNumber || '')
      }),
    [receipts]
  )

  const stats = useMemo(() => {
    const now = new Date()
    const thisYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let total = 0
    let thisMonth = 0
    for (const r of receipts) {
      total += receiptTotal(r)
      if ((r.receiptDate || '').startsWith(thisYm)) thisMonth += 1
    }
    return {
      count: receipts.length,
      totalCollected: total,
      thisMonth,
    }
  }, [receipts])

  const value = {
    settings,
    updateSettings,
    receipts,
    sortedReceipts,
    stats,
    nextReceiptNumber,
    nextReceiptNumbers,
    saveReceipt,
    saveReceipts,
    deleteReceipt,
    getReceipt,
    receiptTotal,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
