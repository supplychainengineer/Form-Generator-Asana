import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate } from '../lib/format'
import {
  IconSearch,
  IconDownload,
  IconFilePlus,
  IconEye,
  IconTrash,
  IconReceipt,
} from '../components/icons'

function toCSV(rows) {
  const headers = [
    'Receipt #',
    'Patient',
    'Responsible Party',
    'Service',
    'Date',
    'Payment Status',
    'Amount',
  ]
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.receiptNumber,
        r.patientName,
        r.responsibleType === 'other' ? r.responsibleName : r.patientName,
        r.serviceDescription,
        formatDate(r.receiptDate),
        r.paymentStatus,
        r.total.toFixed(2),
      ]
        .map(esc)
        .join(',')
    )
  }
  return lines.join('\n')
}

export default function ReceiptHistory() {
  const { sortedReceipts, deleteReceipt, receiptTotal } = useStore()
  const notify = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const rows = useMemo(
    () => sortedReceipts.map((r) => ({ ...r, total: receiptTotal(r) })),
    [sortedReceipts, receiptTotal]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const party = r.responsibleType === 'other' ? r.responsibleName : r.patientName
      return (
        r.patientName?.toLowerCase().includes(q) ||
        party?.toLowerCase().includes(q) ||
        r.receiptNumber?.toLowerCase().includes(q) ||
        r.serviceDescription?.toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  const handleExport = () => {
    const csv = toCSV(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify('CSV exported')
  }

  const handleDelete = (r) => {
    if (window.confirm(`Delete receipt ${r.receiptNumber} for ${r.patientName}?`)) {
      deleteReceipt(r.id)
      notify('Receipt deleted')
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Receipt History</h1>
          <div className="page-sub">{rows.length} receipts total</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={handleExport} disabled={rows.length === 0}>
            <IconDownload /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            <IconFilePlus /> New Receipt
          </button>
        </div>
      </div>

      <div className="search-bar">
        <IconSearch />
        <input
          placeholder="Search by patient, party, or receipt #..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card card-pad">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <IconReceipt />
            <div>
              {rows.length === 0
                ? 'No receipts yet. Create your first one.'
                : 'No receipts match your search.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const party =
                    r.responsibleType === 'other' ? r.responsibleName : r.patientName
                  return (
                    <tr key={r.id}>
                      <td>
                        <span
                          className="cell-receipt"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/new?id=${r.id}`)}
                        >
                          {r.receiptNumber}
                        </span>
                      </td>
                      <td>
                        <div className="cell-patient-name">{r.patientName}</div>
                        {party && party !== r.patientName && (
                          <div className="cell-patient-sub">{party}</div>
                        )}
                      </td>
                      <td>
                        <div className="cell-service" title={r.serviceDescription}>
                          {r.serviceDescription}
                        </div>
                      </td>
                      <td className="cell-date">{formatDate(r.receiptDate)}</td>
                      <td className="cell-amount">{formatCurrency(r.total)}</td>
                      <td>
                        <div className="cell-actions">
                          <button
                            className="icon-btn"
                            title="View / edit"
                            onClick={() => navigate(`/new?id=${r.id}`)}
                          >
                            <IconEye />
                          </button>
                          <button
                            className="icon-btn danger"
                            title="Delete"
                            onClick={() => handleDelete(r)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
