import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../components/Toast'
import { usePdf } from '../components/PdfProvider'
import { paymentStatusOptions } from '../store/defaults'
import { formatCurrency, todayISO } from '../lib/format'
import { chunkPayments } from '../lib/receiptSplit'
import DateField from '../components/DateField'
import ReceiptDocument from '../components/ReceiptDocument'
import {
  IconEye,
  IconDownload,
  IconSave,
  IconUpload,
  IconTrash,
  IconX,
} from '../components/icons'

const KIND_LABEL = {
  payment: 'Payment',
  insurance: 'Insurance',
  other: 'Other',
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')

export default function ImportStatement() {
  const { settings, receipts, nextReceiptNumbers, saveReceipts } = useStore()
  const notify = useToast()
  const { downloadReceipts, busy } = usePdf()
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [files, setFiles] = useState([]) // { name, status, error, found }
  const [txns, setTxns] = useState([])
  const [patientNames, setPatientNames] = useState({}) // group key -> name
  const [dragOver, setDragOver] = useState(false)
  const [showOther, setShowOther] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState({})

  const [details, setDetails] = useState({
    patientAddress: '',
    responsibleType: 'self',
    responsibleName: '',
    serviceDescription: '',
    contractDate: '',
    appliancePlaced: '',
    paymentStatus: 'Payment Plan',
    includeTransitionNote: false,
    mode: 'combined', // 'combined' | 'each'
    dateMode: 'today', // 'today' | 'lastPayment'
    lineLabel: 'generic', // 'generic' | 'service' | 'statement'
  })
  const setD = (patch) => setDetails((d) => ({ ...d, ...patch }))

  // ------------------------------------------------------------ reading PDFs

  const handleFiles = async (fileList) => {
    const pdfs = Array.from(fileList || []).filter(
      (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    )
    if (!pdfs.length) {
      notify('Please choose PDF statement files')
      return
    }
    setFiles((list) => [
      ...list,
      ...pdfs.map((f) => ({ name: f.name, status: 'reading' })),
    ])

    // Load the parser (and PDF engine) only when it's actually needed.
    const { parseStatement } = await import('../lib/statementParser')

    for (const file of pdfs) {
      try {
        const parsed = await parseStatement(file)
        let error = ''
        if (parsed.lineCount === 0) {
          error =
            'No text found — this looks like a scanned image. Export the statement as a text PDF from your practice software.'
        }
        const found = parsed.transactions.filter((t) => t.kind === 'payment').length
        setFiles((list) =>
          list.map((f) =>
            f.name === file.name && f.status === 'reading'
              ? { ...f, status: error ? 'error' : 'done', error, found }
              : f
          )
        )
        if (error) continue

        if (parsed.responsibleName) {
          setDetails((d) =>
            d.responsibleName
              ? d
              : {
                  ...d,
                  responsibleName: parsed.responsibleName,
                  responsibleType:
                    norm(parsed.responsibleName) !== norm(parsed.patientName)
                      ? 'other'
                      : 'self',
                }
          )
        }
        setPatientNames((names) => {
          const next = { ...names }
          for (const t of parsed.transactions) {
            const key = t.patient || ''
            if (!(key in next)) next[key] = t.patient || parsed.patientName || ''
          }
          return next
        })
        setTxns((list) => [
          ...list,
          ...parsed.transactions.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
            file: file.name,
            include: t.kind === 'payment',
            group: t.patient || '',
          })),
        ])
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
        setFiles((list) =>
          list.map((f) =>
            f.name === file.name && f.status === 'reading'
              ? { ...f, status: 'error', error: 'Could not read this PDF.' }
              : f
          )
        )
      }
    }
  }

  const clearAll = () => {
    setFiles([])
    setTxns([])
    setPatientNames({})
    setErrors({})
  }

  // ------------------------------------------------ duplicates & grouping

  // Flag payments already on a saved receipt (same patient, date and amount),
  // or repeated across overlapping statements.
  const dupInfo = useMemo(() => {
    const info = {}
    const seen = new Set()
    for (const t of txns) {
      if (t.kind !== 'payment' && t.kind !== 'insurance') continue
      const name = norm(patientNames[t.group])
      const key = `${name}|${t.date}|${Number(t.amount).toFixed(2)}`
      const existing = receipts.find(
        (r) =>
          norm(r.patientName) === name &&
          (r.payments || []).some(
            (p) => p.date === t.date && Math.abs((parseFloat(p.amount) || 0) - t.amount) < 0.005
          )
      )
      if (existing) info[t.id] = `Already on ${existing.receiptNumber}`
      else if (seen.has(key + '|' + norm(t.description))) info[t.id] = 'Duplicate line'
      seen.add(key + '|' + norm(t.description))
    }
    return info
  }, [txns, receipts, patientNames])

  // Untick duplicates the first time they are detected.
  const flagged = useRef(new Set())
  useEffect(() => {
    const fresh = Object.keys(dupInfo).filter((id) => !flagged.current.has(id))
    if (!fresh.length) return
    fresh.forEach((id) => flagged.current.add(id))
    setTxns((list) =>
      list.map((t) => (fresh.includes(t.id) ? { ...t, include: false } : t))
    )
  }, [dupInfo])

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of txns) {
      if (!map.has(t.group)) map.set(t.group, [])
      map.get(t.group).push(t)
    }
    return [...map.entries()].map(([key, list]) => ({
      key,
      list: [...list].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }, [txns])

  const setTxn = (id, patch) =>
    setTxns((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const removeTxn = (id) => setTxns((list) => list.filter((t) => t.id !== id))

  const toggleGroup = (key, include) =>
    setTxns((list) =>
      list.map((t) =>
        t.group === key && t.kind === 'payment' && !dupInfo[t.id] ? { ...t, include } : t
      )
    )

  // --------------------------------------------------- building receipts

  const selected = txns.filter((t) => t.include && t.amount > 0 && t.date)
  const selectedTotal = selected.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

  const buildReceipts = () => {
    const service = details.serviceDescription.trim()
    // Line items never carry the treatment/procedure code (e.g. "(D8080)").
    const serviceNoCode =
      service.replace(/\s*[([]?\bD\d{4}\b[)\]]?/gi, '').replace(/\s{2,}/g, ' ').trim()
    const lineFor = (t) => {
      if (details.lineLabel === 'statement') return t.description
      if (details.lineLabel === 'service') return serviceNoCode || 'Orthodontic Treatment'
      return 'Orthodontic Treatment'
    }
    const out = []

    for (const g of groups) {
      const picked = g.list.filter((t) => t.include && t.amount > 0 && t.date)
      if (!picked.length) continue
      const base = {
        id: null,
        receiptNumber: '',
        patientName: (patientNames[g.key] || '').trim(),
        patientAddress: details.patientAddress,
        responsibleType: details.responsibleType,
        responsibleName: details.responsibleType === 'other' ? details.responsibleName : '',
        services: [
          {
            description: service,
            contractDate: details.contractDate,
            appliancePlaced: details.appliancePlaced,
          },
        ],
        serviceDescription: service,
        contractDate: details.contractDate,
        appliancePlaced: details.appliancePlaced,
        feeBreakdown: [],
        paymentStatus: details.paymentStatus,
        includeTransitionNote: details.includeTransitionNote,
        source: 'statement-import',
      }
      const payments = picked.map((t) => ({
        date: t.date,
        amount: Math.round(parseFloat(t.amount) * 100) / 100,
        label: lineFor(t),
      }))

      const sets =
        details.mode === 'each'
          ? payments.map((p) => [p])
          : chunkPayments({ ...base, payments }, settings)
      const groupId = sets.length > 1 && details.mode === 'combined' ? crypto.randomUUID() : null

      sets.forEach((pays, i) => {
        const lastDate = pays.reduce((m, p) => (p.date > m ? p.date : m), '')
        out.push({
          ...base,
          id: crypto.randomUUID(),
          payments: pays,
          receiptDate:
            details.mode === 'each' || details.dateMode === 'lastPayment'
              ? lastDate || todayISO()
              : todayISO(),
          ...(groupId ? { splitGroup: groupId, part: i + 1, partCount: sets.length } : {}),
        })
      })
    }

    const numbers = nextReceiptNumbers(out.map((r) => r.receiptDate))
    const now = new Date().toISOString()
    return out.map((r, i) => ({ ...r, receiptNumber: numbers[i], createdAt: now }))
  }

  const plannedReceipts = useMemo(
    () => (selected.length ? buildReceipts() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txns, details, patientNames, settings, receipts]
  )

  const validate = () => {
    const e = {}
    if (!selected.length) e.none = true
    if (!details.serviceDescription.trim()) e.service = true
    for (const g of groups) {
      if (g.list.some((t) => t.include) && !(patientNames[g.key] || '').trim()) {
        e.patient = true
      }
    }
    setErrors(e)
    if (e.none) notify('Select at least one payment')
    else if (Object.keys(e).length) notify('Please fill in the required fields')
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const list = buildReceipts()
    saveReceipts(list)
    notify(`${list.length} receipt${list.length === 1 ? '' : 's'} saved`)
    navigate('/history')
  }

  const handleSaveAndPdf = async () => {
    if (!validate()) return
    const list = buildReceipts()
    saveReceipts(list)
    await downloadReceipts(list)
    notify(`${list.length} receipt${list.length === 1 ? '' : 's'} saved & downloaded`)
    navigate('/history')
  }

  const handlePreview = () => {
    if (!validate()) return
    setShowPreview(true)
  }

  // ------------------------------------------------------------------ view

  const hasData = txns.length > 0
  const otherCount = txns.filter((t) => t.kind === 'other').length

  const summary = (() => {
    if (!plannedReceipts.length) return null
    const byPatient = new Map()
    for (const r of plannedReceipts) {
      const k = r.patientName || 'Patient'
      if (!byPatient.has(k)) byPatient.set(k, [])
      byPatient.get(k).push(r.payments.length)
    }
    return [...byPatient.entries()].map(([name, counts]) => ({ name, counts }))
  })()

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Import Statement</h1>
          <div className="page-sub">
            Upload statement PDFs — payments received are read automatically and
            turned into receipts
          </div>
        </div>
        {hasData && (
          <div className="head-actions">
            <button className="btn btn-ghost" onClick={handlePreview}>
              <IconEye /> Preview
            </button>
            <button className="btn btn-ghost" onClick={handleSaveAndPdf} disabled={busy}>
              <IconDownload /> {busy ? 'Generating…' : 'Save & Download PDF'}
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <IconSave /> Save {plannedReceipts.length || ''} Receipt
              {plannedReceipts.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="card card-pad form-card">
        <div
          className={'drop-zone' + (dragOver ? ' over' : '')}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
        >
          <IconUpload />
          <div className="drop-title">Drop statement PDFs here, or click to choose</div>
          <div className="drop-sub">
            You can add several statements at once. Files are read in your
            browser and never uploaded anywhere.
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {files.length > 0 && (
          <div className="import-files">
            {files.map((f, i) => (
              <div className={'import-file ' + f.status} key={f.name + i}>
                <span className="import-file-name">{f.name}</span>
                <span className="import-file-status">
                  {f.status === 'reading' && 'Reading…'}
                  {f.status === 'done' &&
                    `${f.found} payment${f.found === 1 ? '' : 's'} found`}
                  {f.status === 'error' && f.error}
                </span>
              </div>
            ))}
            <button className="link-btn" style={{ color: 'var(--red)' }} onClick={clearAll}>
              <IconTrash /> Clear all
            </button>
          </div>
        )}
      </div>

      {hasData && (
        <>
          {/* Receipt details */}
          <div className="card card-pad form-card">
            <h3 className="form-section-title">Receipt Details</h3>

            {groups.map((g) => (
              <div className="field" key={g.key || 'single'}>
                <label className="label">
                  Patient Name{groups.length > 1 ? ` (${g.key || 'unlabeled lines'})` : ''}{' '}
                  <span className="req">*</span>
                </label>
                <input
                  className="input"
                  placeholder="Enter patient name"
                  value={patientNames[g.key] || ''}
                  onChange={(e) =>
                    setPatientNames((n) => ({ ...n, [g.key]: e.target.value }))
                  }
                />
              </div>
            ))}
            {errors.patient && (
              <div className="field-error">Patient name is required</div>
            )}

            <div className="field">
              <label className="label">Patient Address</label>
              <input
                className="input"
                placeholder="Enter patient address"
                value={details.patientAddress}
                onChange={(e) => setD({ patientAddress: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="label">Responsible Party</label>
              <div className="segmented">
                <button
                  type="button"
                  className={'seg-option' + (details.responsibleType === 'self' ? ' active' : '')}
                  onClick={() => setD({ responsibleType: 'self' })}
                >
                  Self (Patient)
                </button>
                <button
                  type="button"
                  className={'seg-option' + (details.responsibleType === 'other' ? ' active' : '')}
                  onClick={() => setD({ responsibleType: 'other' })}
                >
                  Other Person
                </button>
              </div>
              {details.responsibleType === 'other' && (
                <input
                  className="input"
                  style={{ marginTop: 12 }}
                  placeholder="Enter responsible party name"
                  value={details.responsibleName}
                  onChange={(e) => setD({ responsibleName: e.target.value })}
                />
              )}
            </div>

            <div className="field">
              <label className="label">
                Service Description <span className="req">*</span>
              </label>
              <input
                className="input"
                placeholder="e.g., Teen Comprehensive (D8080)"
                value={details.serviceDescription}
                onChange={(e) => setD({ serviceDescription: e.target.value })}
              />
              {errors.service && (
                <div className="field-error">Service description is required</div>
              )}
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">Contract Date</label>
                <DateField
                  value={details.contractDate}
                  onChange={(v) => setD({ contractDate: v })}
                />
              </div>
              <div className="field">
                <label className="label">Appliance Placed</label>
                <DateField
                  value={details.appliancePlaced}
                  onChange={(v) => setD({ appliancePlaced: v })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">Payment Status</label>
                <select
                  className="select"
                  value={details.paymentStatus}
                  onChange={(e) => setD({ paymentStatus: e.target.value })}
                >
                  {paymentStatusOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Line Item Description</label>
                <select
                  className="select"
                  value={details.lineLabel}
                  onChange={(e) => setD({ lineLabel: e.target.value })}
                >
                  <option value="generic">Orthodontic Treatment</option>
                  <option value="service">Service name (without code)</option>
                  <option value="statement">Text from the statement</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Receipts</label>
                <select
                  className="select"
                  value={details.mode}
                  onChange={(e) => setD({ mode: e.target.value })}
                >
                  <option value="combined">
                    Combine payments (split automatically to keep one page)
                  </option>
                  <option value="each">One receipt per payment</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">Receipt Date</label>
                <select
                  className="select"
                  value={details.mode === 'each' ? 'lastPayment' : details.dateMode}
                  disabled={details.mode === 'each'}
                  onChange={(e) => setD({ dateMode: e.target.value })}
                >
                  <option value="today">Today</option>
                  <option value="lastPayment">Date of last payment on the receipt</option>
                </select>
              </div>
            </div>

            {settings.transitionNote && (
              <label className="note-toggle-head" style={{ marginTop: 18 }}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={details.includeTransitionNote}
                  onChange={(e) => setD({ includeTransitionNote: e.target.checked })}
                />
                Include practice transition note
              </label>
            )}
          </div>

          {/* Payments found */}
          <div className="card card-pad form-card">
            <div className="section-head" style={{ marginBottom: 16 }}>
              <h3 className="form-section-title" style={{ margin: 0 }}>
                Payments Found
              </h3>
              {otherCount > 0 && (
                <label className="note-toggle-head" style={{ fontWeight: 500, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={showOther}
                    onChange={(e) => setShowOther(e.target.checked)}
                  />
                  Show {otherCount} other line{otherCount === 1 ? '' : 's'} (charges,
                  adjustments…)
                </label>
              )}
            </div>
            <div className="import-hint">
              Patient payments are ticked automatically. Insurance payments and
              anything already on a saved receipt are left unticked — tick them
              if you want them included. Dates and amounts can be corrected below.
            </div>

            {groups.map((g) => {
              const rows = g.list.filter((t) => showOther || t.kind !== 'other')
              if (!rows.length) return null
              return (
                <div key={g.key || 'single'} className="import-group">
                  {groups.length > 1 && (
                    <div className="import-group-head">
                      {patientNames[g.key] || g.key || 'Unlabeled lines'}
                      <span>
                        <button className="link-btn" onClick={() => toggleGroup(g.key, true)}>
                          Select all
                        </button>
                        <button className="link-btn" onClick={() => toggleGroup(g.key, false)}>
                          None
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="table-wrap">
                    <table className="import-table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }} />
                          <th style={{ width: 170 }}>Date</th>
                          <th>Statement line</th>
                          <th style={{ width: 96 }}>Type</th>
                          <th style={{ width: 130 }} className="text-right">
                            Amount
                          </th>
                          <th style={{ width: 40 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((t) => (
                          <tr key={t.id} className={t.include ? '' : 'off'}>
                            <td>
                              <input
                                type="checkbox"
                                className="checkbox"
                                checked={t.include}
                                onChange={(e) => setTxn(t.id, { include: e.target.checked })}
                              />
                            </td>
                            <td>
                              <input
                                className="input input-sm"
                                type="date"
                                value={t.date}
                                onChange={(e) => setTxn(t.id, { date: e.target.value })}
                              />
                            </td>
                            <td>
                              <div className="import-desc">{t.description}</div>
                              <div className="import-meta">
                                {t.file} · p.{t.page}
                                {dupInfo[t.id] && (
                                  <span className="import-dup"> · {dupInfo[t.id]}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={'kind-badge ' + t.kind}>{KIND_LABEL[t.kind]}</span>
                            </td>
                            <td className="text-right">
                              <input
                                className="input input-sm text-right"
                                type="number"
                                step="0.01"
                                min="0"
                                value={t.amount}
                                onChange={(e) =>
                                  setTxn(t.id, { amount: parseFloat(e.target.value) || 0 })
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="icon-btn danger"
                                title="Remove line"
                                onClick={() => removeTxn(t.id)}
                              >
                                <IconTrash />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            <div className="total-row">
              <span className="total-label">
                {selected.length} payment{selected.length === 1 ? '' : 's'} selected
              </span>
              <span className="total-value">{formatCurrency(selectedTotal)}</span>
            </div>

            {summary && (
              <div className="import-summary">
                {summary.map(({ name, counts }) => (
                  <div key={name}>
                    <strong>{name}</strong>: {counts.length} receipt
                    {counts.length === 1 ? '' : 's'}
                    {details.mode === 'combined' && counts.length > 1 && (
                      <> — {counts.join(' + ')} line items, split so each receipt stays on one page</>
                    )}
                  </div>
                ))}
              </div>
            )}
            {errors.none && <div className="field-error">Select at least one payment</div>}
          </div>
        </>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                Preview — {plannedReceipts.length} receipt
                {plannedReceipts.length === 1 ? '' : 's'}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={async () => {
                    await downloadReceipts(plannedReceipts)
                    notify('PDF downloaded (not saved yet)')
                  }}
                >
                  <IconDownload /> {busy ? 'Generating…' : 'PDF'}
                </button>
                <button className="icon-btn" onClick={() => setShowPreview(false)}>
                  <IconX />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ padding: 0, borderRadius: '0 0 16px 16px' }}>
              {plannedReceipts.map((r, i) => (
                <div key={r.id} className={i > 0 ? 'preview-part-gap' : undefined}>
                  <ReceiptDocument receipt={r} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

