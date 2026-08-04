import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../components/Toast'
import { usePrint } from '../components/PrintProvider'
import { paymentStatusOptions } from '../store/defaults'
import { formatCurrency, todayISO } from '../lib/format'
import DateField from '../components/DateField'
import ReceiptDocument from '../components/ReceiptDocument'
import {
  IconEye,
  IconDownload,
  IconSave,
  IconPlus,
  IconBolt,
  IconTrash,
  IconX,
} from '../components/icons'

function blankPayment(label = 'Orthodontic Treatment') {
  return { date: '', amount: '', label }
}

function emptyDraft() {
  return {
    id: null,
    receiptNumber: '',
    receiptDate: todayISO(),
    patientName: '',
    patientAddress: '',
    responsibleType: 'self',
    responsibleName: '',
    serviceDescription: '',
    contractDate: '',
    appliancePlaced: '',
    paymentStatus: 'Full Payment',
    payments: [blankPayment()],
    includeTransitionNote: false,
  }
}

export default function NewReceipt() {
  const { getReceipt, saveReceipt, nextReceiptNumber, settings, receiptTotal } =
    useStore()
  const notify = useToast()
  const printReceipt = usePrint()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('id')

  const [draft, setDraft] = useState(emptyDraft)
  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState({})

  // Load an existing receipt for viewing/editing.
  useEffect(() => {
    if (editId) {
      const existing = getReceipt(editId)
      if (existing) {
        setDraft({ ...emptyDraft(), ...existing })
        return
      }
    }
    setDraft(emptyDraft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const setPayment = (i, patch) =>
    setDraft((d) => {
      const payments = d.payments.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
      return { ...d, payments }
    })

  const addPayment = () =>
    setDraft((d) => ({
      ...d,
      payments: [...d.payments, blankPayment(`Installment ${d.payments.length + 1}`)],
    }))

  const removePayment = (i) =>
    setDraft((d) => ({
      ...d,
      payments: d.payments.filter((_, idx) => idx !== i),
    }))

  // "Payment Plan" quick action: switch status + add a couple installments.
  const applyPaymentPlan = () =>
    setDraft((d) => ({
      ...d,
      paymentStatus: 'Payment Plan',
      payments:
        d.payments.length > 1
          ? d.payments
          : [
              { ...d.payments[0], label: 'Installment 1' },
              blankPayment('Installment 2'),
            ],
    }))

  const total = useMemo(
    () => draft.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
    [draft.payments]
  )

  const validate = () => {
    const e = {}
    if (!draft.receiptDate) e.receiptDate = true
    if (!draft.patientName.trim()) e.patientName = true
    if (!draft.serviceDescription.trim()) e.serviceDescription = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Build a full receipt record from the current draft.
  const buildReceipt = () => {
    const id = draft.id || crypto.randomUUID()
    const receiptNumber =
      draft.receiptNumber || nextReceiptNumber(draft.receiptDate)
    return {
      ...draft,
      id,
      receiptNumber,
      payments: draft.payments.map((p) => ({
        ...p,
        amount: parseFloat(p.amount) || 0,
      })),
      createdAt: draft.createdAt || new Date().toISOString(),
    }
  }

  const handleSave = () => {
    if (!validate()) {
      notify('Please fill in the required fields')
      return
    }
    const receipt = buildReceipt()
    saveReceipt(receipt)
    notify(draft.id ? 'Receipt updated' : 'Receipt saved')
    navigate('/history')
  }

  const handlePdf = () => {
    if (!validate()) {
      notify('Please fill in the required fields')
      return
    }
    printReceipt(buildReceipt())
  }

  const previewReceipt = useMemo(() => {
    return {
      ...draft,
      receiptNumber:
        draft.receiptNumber || nextReceiptNumber(draft.receiptDate),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, showPreview])

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{draft.id ? 'Edit Receipt' : 'New Receipt'}</h1>
          <div className="page-sub">Create an FSA/HSA compliant receipt</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={() => setShowPreview(true)}>
            <IconEye /> Show Preview
          </button>
          <button className="btn btn-ghost" onClick={handlePdf}>
            <IconDownload /> PDF
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <IconSave /> Save Receipt
          </button>
        </div>
      </div>

      {/* Receipt date */}
      <div className="card card-pad form-card">
        <div className="field">
          <label className="label">
            Receipt Date <span className="req">*</span>
          </label>
          <DateField
            value={draft.receiptDate}
            onChange={(v) => set({ receiptDate: v })}
          />
          {errors.receiptDate && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>
              Receipt date is required
            </div>
          )}
        </div>
      </div>

      {/* Patient information */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">Patient Information</h3>

        <div className="field">
          <label className="label">
            Patient Name <span className="req">*</span>
          </label>
          <input
            className="input"
            placeholder="Enter patient name"
            value={draft.patientName}
            onChange={(e) => set({ patientName: e.target.value })}
          />
          {errors.patientName && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>
              Patient name is required
            </div>
          )}
        </div>

        <div className="field">
          <label className="label">Patient Address</label>
          <input
            className="input"
            placeholder="Enter patient address"
            value={draft.patientAddress}
            onChange={(e) => set({ patientAddress: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label">Responsible Party</label>
          <div className="segmented">
            <button
              type="button"
              className={
                'seg-option' + (draft.responsibleType === 'self' ? ' active' : '')
              }
              onClick={() => set({ responsibleType: 'self' })}
            >
              Self (Patient)
            </button>
            <button
              type="button"
              className={
                'seg-option' + (draft.responsibleType === 'other' ? ' active' : '')
              }
              onClick={() => set({ responsibleType: 'other' })}
            >
              Other Person
            </button>
          </div>

          {draft.responsibleType === 'other' && (
            <div className="field" style={{ marginTop: 16 }}>
              <label className="label">Responsible Party Name</label>
              <input
                className="input"
                placeholder="Enter responsible party name"
                value={draft.responsibleName}
                onChange={(e) => set({ responsibleName: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Service details */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">Service Details</h3>

        <div className="field">
          <label className="label">
            Service Description <span className="req">*</span>
          </label>
          <input
            className="input"
            placeholder="e.g., Teen Comprehensive (D8080)"
            value={draft.serviceDescription}
            onChange={(e) => set({ serviceDescription: e.target.value })}
          />
          {errors.serviceDescription && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>
              Service description is required
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="label">Contract Date</label>
            <DateField
              value={draft.contractDate}
              onChange={(v) => set({ contractDate: v })}
            />
          </div>
          <div className="field">
            <label className="label">Appliance Placed</label>
            <DateField
              value={draft.appliancePlaced}
              onChange={(v) => set({ appliancePlaced: v })}
            />
          </div>
        </div>
      </div>

      {/* Payment details */}
      <div className="card card-pad form-card">
        <div className="section-head" style={{ marginBottom: 20 }}>
          <h3 className="form-section-title" style={{ margin: 0 }}>
            Payment Details
          </h3>
          <div style={{ display: 'flex', gap: 18 }}>
            <button className="link-btn" style={{ color: 'var(--green)' }} onClick={applyPaymentPlan}>
              <IconBolt /> Payment Plan
            </button>
            <button className="link-btn" onClick={addPayment}>
              <IconPlus /> Add Payment
            </button>
          </div>
        </div>

        <div className="field">
          <label className="label">Payment Status</label>
          <select
            className="select"
            value={draft.paymentStatus}
            onChange={(e) => set({ paymentStatus: e.target.value })}
          >
            {paymentStatusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {draft.payments.map((p, i) => (
          <div className="payment-block" key={i}>
            <div className="payment-block-head">
              <div className="payment-block-title">
                Payment #{i + 1} — {p.label || 'Orthodontic Treatment'}
              </div>
              {draft.payments.length > 1 && (
                <button
                  className="icon-btn danger"
                  title="Remove payment"
                  onClick={() => removePayment(i)}
                >
                  <IconTrash />
                </button>
              )}
            </div>
            <div className="grid-2">
              <div>
                <span className="small-label">Date of Payment</span>
                <DateField value={p.date} onChange={(v) => setPayment(i, { date: v })} />
              </div>
              <div>
                <span className="small-label">Amount ($)</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={p.amount}
                  onChange={(e) => setPayment(i, { amount: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="total-row">
          <span className="total-label">Total</span>
          <span className="total-value">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Transition note toggle */}
      {settings.transitionNote ? (
        <div className="note-toggle">
          <label className="note-toggle-head">
            <input
              type="checkbox"
              className="checkbox"
              checked={draft.includeTransitionNote}
              onChange={(e) => set({ includeTransitionNote: e.target.checked })}
            />
            Include practice transition note
          </label>
          <div className="note-toggle-text">{settings.transitionNote}</div>
        </div>
      ) : (
        <div className="note-toggle" style={{ background: '#f8fafc', borderColor: '#e5e7eb' }}>
          <label className="note-toggle-head" style={{ color: 'var(--muted)' }}>
            <input type="checkbox" className="checkbox" disabled />
            Include practice transition note
          </label>
          <div className="note-toggle-text" style={{ color: 'var(--muted-2)' }}>
            Add a transition note in Settings to enable this option.
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Receipt Preview</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => printReceipt(previewReceipt)}>
                  <IconDownload /> PDF
                </button>
                <button className="icon-btn" onClick={() => setShowPreview(false)}>
                  <IconX />
                </button>
              </div>
            </div>
            <div className="modal-body">
              <ReceiptDocument receipt={previewReceipt} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
