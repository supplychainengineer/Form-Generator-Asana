import { useStore } from '../store/StoreContext'
import { formatCurrency, formatDate } from '../lib/format'

// Turns a payment-status label into the descriptive word used in the
// receipt sentences, e.g. "Full Payment" -> "Full", "Partial Payment" -> "Partial".
function statusWord(status) {
  if (!status) return 'Full'
  const m = /^(.*?)\s*payment$/i.exec(status.trim())
  if (m && m[1]) return m[1].trim()
  return status.trim()
}

// Renders a printable FSA/HSA compliant receipt from a receipt record + the
// configured practice settings. Used both in the on-screen preview and when
// exporting to PDF (via the browser print dialog).
export default function ReceiptDocument({ receipt }) {
  const { settings, receiptTotal } = useStore()
  const total = receiptTotal(receipt)
  const providerName = settings.providerName || 'Your Practice Name'
  const word = statusWord(receipt.paymentStatus)

  const responsibleParty =
    receipt.responsibleType === 'other' && receipt.responsibleName
      ? receipt.responsibleName
      : receipt.patientName

  // Support both the new `services` array and legacy single-service fields.
  const services =
    receipt.services && receipt.services.length
      ? receipt.services
      : [
          {
            description: receipt.serviceDescription || '',
            contractDate: receipt.contractDate || '',
            appliancePlaced: receipt.appliancePlaced || '',
          },
        ]

  const footerContacts = [
    settings.phone && `T: ${settings.phone}`,
    settings.fax && `F: ${settings.fax}`,
    settings.website,
  ]
    .filter(Boolean)
    .join('  |  ')

  return (
    <div className="receipt-doc">
      {/* Header — inline colors so html2canvas reliably paints the dark bar. */}
      <div className="r-header" style={{ backgroundColor: '#0e1626', borderBottom: '4px solid #8faa6b' }}>
        <div className="r-header-left">
          {settings.logo && (
            <div className="r-logo">
              <img src={settings.logo} alt="Practice logo" />
            </div>
          )}
          <div className="r-provider" style={{ color: '#ffffff' }}>{providerName}</div>
        </div>
        <div className="r-header-right">
          <div className="r-doc-type" style={{ color: '#ffffff' }}>FSA / HSA RECEIPT</div>
          <div className="r-number" style={{ color: '#8a97ad' }}>{receipt.receiptNumber}</div>
        </div>
      </div>

      <div className="r-body">
        {/* Date */}
        <div className="r-datebar">
          <span className="lbl">Date</span>
          <span className="val">{formatDate(receipt.receiptDate)}</span>
        </div>

        {/* Practice + Patient */}
        <div className="r-section">
          <div className="r-cols2">
            <div>
              <div className="r-slabel">Practice Information</div>
              <div className="r-name">{providerName}</div>
              {settings.address && <div className="r-muted">{settings.address}</div>}
              {settings.tin && (
                <div className="r-inline">
                  <span className="k">TIN:</span>
                  <span className="v">{settings.tin}</span>
                </div>
              )}
            </div>
            <div>
              <div className="r-slabel">Patient Information</div>
              <div className="r-name">{receipt.patientName || '—'}</div>
              {receipt.patientAddress && (
                <div className="r-muted">{receipt.patientAddress}</div>
              )}
              <div className="r-inline">
                <span className="k">Responsible Party:</span>
                <span className="v">{responsibleParty || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service details */}
        <div className="r-section">
          <div className="r-slabel">Service Details</div>
          <div className="r-cols3 r-service-head">
            <div className="r-field-label">Service Description</div>
            <div className="r-field-label">Contract Date</div>
            <div className="r-field-label">Appliance Placed</div>
          </div>
          {services.map((s, i) => (
            <div className="r-cols3 r-service-row" key={i}>
              <div className="r-field-value">{s.description || '—'}</div>
              <div className="r-field-value">
                {s.contractDate ? formatDate(s.contractDate) : '—'}
              </div>
              <div className="r-field-value">
                {s.appliancePlaced ? formatDate(s.appliancePlaced) : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Payment details */}
        <div className="r-section">
          <div className="r-slabel">Payment Details</div>
          <div className="r-pay-sentence">
            This confirms that {word} payment has been received for the qualified
            orthodontic services rendered to {receipt.patientName || 'the patient'}.
          </div>
          <table className="r-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Date of Payment</th>
                <th className="num">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {(receipt.payments || []).map((p, i) => (
                <tr key={i}>
                  <td>{p.label || 'Orthodontic Treatment'}</td>
                  <td>{formatDate(p.date) || '—'}</td>
                  <td className="num">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
              <tr className="r-total-row">
                <td colSpan={2}>Total Amount Paid</td>
                <td className="num">{formatCurrency(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Certification */}
        <div className="r-section last">
          <div className="r-slabel">Certification</div>
          <div className="r-cert-text">
            I certify that the services listed above were provided on the date
            specified and that the payment covers the {word} treatment fee.
          </div>
          {receipt.includeTransitionNote && settings.transitionNote && (
            <div className="r-cert-text" style={{ marginTop: 10, fontStyle: 'italic', color: '#6b7280' }}>
              {settings.transitionNote}
            </div>
          )}

          <div className="r-sincerely">Sincerely,</div>
          {settings.signature ? (
            <div className="r-sign-img">
              <img src={settings.signature} alt="Signature" />
            </div>
          ) : (
            <div className="r-sign-gap" />
          )}
          <div className="r-doc-name">{settings.doctorName || 'Provider Name'}</div>
          {settings.doctorTitle && <div className="r-doc-title">{settings.doctorTitle}</div>}
        </div>
      </div>

      {/* Footer */}
      <div
        className="r-footer"
        style={{ backgroundColor: '#0e1626', borderTop: '4px solid #8faa6b', color: '#9aa6bd' }}
      >
        <div className="r-foot-left">{settings.address}</div>
        <div className="dots" style={{ color: '#8faa6b' }}>•••</div>
        <div className="r-foot-right">{footerContacts}</div>
      </div>
    </div>
  )
}
