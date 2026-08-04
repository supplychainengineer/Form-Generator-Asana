// Small formatting helpers shared across pages.

export function formatCurrency(n) {
  const v = parseFloat(n)
  if (isNaN(v)) return '$0.00'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

// Accepts an ISO date string (YYYY-MM-DD) and returns MM/DD/YYYY.
export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${m}/${d}/${y}`
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

// Derive short brand initials from a practice name, e.g. "Bright Smiles" -> "BS"
export function initialsFrom(name) {
  if (!name) return 'RX'
  const words = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'RX'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
