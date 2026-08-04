import { useStore } from '../store/StoreContext'
import { formatCurrency, formatDate } from '../lib/format'

// Renders a printable FSA/HSA compliant receipt from a receipt record + the
// configured practice settings. Used both in the on-screen preview and when
// exporting to PDF (via the browser print dialog).
export default function ReceiptDocument({ receipt }) {
  const { settings, receiptTotal } = useStore()
  const total = receiptTotal(receipt)

  const responsibleParty =
    receipt.responsibleType === 'other' && receipt.responsibleName
      ? receipt.responsibleName
      : receipt.patientName

  return (
    <div className="receipt-doc">
      {/* Header */}
      <div className="receipt-header">
        <div className="receipt-logo">
          {settings.logo ? (
            <img src={settings.logo} alt="Practice logo" />
          ) : (
            <div className="logo-fallback">
              {settings.providerName?.split('(')[0].trim() || 'Your Practice'}
            </div>
          )}
        </div>
        <div className="receipt-practice">
          {settings.providerName && <strong>{settings.providerName}</strong>}
          {settings.address && (
            <>
              <br />
              {settings.address}
            </>
          )}
          {(settings.phone || settings.fax) && (
            <>
              <br />
              {settings.phone && <>Tel: {settings.phone}</>}
              {settings.phone && settings.fax && <> · </>}
              {settings.fax && <>Fax: {settings.fax}</>}
            </>
          )}
          {(settings.email || settings.website) && (
            <>
              <br />
              {settings.email}
              {settings.email && settings.website && <> · </>}
              {settings.website}
            </>
          )}
          {settings.tin && (
            <>
              <br />
              TIN/EIN: {settings.tin}
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="receipt-title">
        <h2>Payment Receipt</h2>
        <div className="rt-sub">FSA / HSA Reimbursement Receipt</div>
      </div>

      {/* Meta */}
      <div className="receipt-meta">
        <div className="meta-block">
          <div className="meta-label">Receipt #</div>
          <div className="meta-value mono">{receipt.receiptNumber}</div>
        </div>
        <div className="meta-block" style={{ textAlign: 'right' }}>
          <div className="meta-label">Receipt Date</div>
          <div className="meta-value mono">{formatDate(receipt.receiptDate)}</div>
        </div>
      </div>

      {/* Patient */}
      <div className="receipt-section">
        <h4>Patient Information</h4>
        <div className="receipt-kv">
          <div className="k">Patient Name</div>
          <div className="v">{receipt.patientName || '—'}</div>
          {receipt.patientAddress && (
            <>
              <div className="k">Patient Address</div>
              <div className="v">{receipt.patientAddress}</div>
            </>
          )}
          <div className="k">Responsible Party</div>
          <div className="v">
            {responsibleParty}
            {receipt.responsibleType === 'other' ? '' : ' (Self)'}
          </div>
        </div>
      </div>

      {/* Service */}
      <div className="receipt-section">
        <h4>Service Details</h4>
        <div className="receipt-kv">
          <div className="k">Service Description</div>
          <div className="v">{receipt.serviceDescription || '—'}</div>
          {receipt.contractDate && (
            <>
              <div className="k">Contract Date</div>
              <div className="v">{formatDate(receipt.contractDate)}</div>
            </>
          )}
          {receipt.appliancePlaced && (
            <>
              <div className="k">Appliance Placed</div>
              <div className="v">{formatDate(receipt.appliancePlaced)}</div>
            </>
          )}
          <div className="k">Payment Status</div>
          <div className="v">{receipt.paymentStatus}</div>
        </div>
      </div>

      {/* Payments */}
      <div className="receipt-section">
        <h4>Payment History</h4>
        <table className="pay-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.payments || []).map((p, i) => (
              <tr key={i}>
                <td className="mono">{formatDate(p.date) || '—'}</td>
                <td>{p.label || 'Orthodontic Treatment'}</td>
                <td className="num">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total Paid</td>
              <td className="num">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Certification */}
      <div className="receipt-section">
        <h4>Certification</h4>
        <div className="receipt-cert">
          This receipt is provided for the purpose of reimbursement through a
          Flexible Spending Account (FSA) or Health Savings Account (HSA). It
          certifies that the amount shown above was paid for medically necessary
          dental / orthodontic services rendered to the patient named above.
          {receipt.includeTransitionNote && settings.transitionNote && (
            <div className="transition">{settings.transitionNote}</div>
          )}
        </div>
      </div>

      {/* Signature */}
      <div className="receipt-sign">
        <div className="sign-block">
          {settings.signature && (
            <div className="sign-img">
              <img src={settings.signature} alt="Signature" />
            </div>
          )}
          <div className="sign-line">
            <div className="sign-name">{settings.doctorName || 'Provider'}</div>
            {settings.doctorTitle && (
              <div className="sign-title">{settings.doctorTitle}</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="receipt-footer">
        Thank you for choosing{' '}
        {settings.providerName?.split('(')[0].trim() || 'our practice'}.
        {settings.reviewLink && (
          <>
            {' '}
            We'd appreciate your feedback:{' '}
            <a href={settings.reviewLink}>{settings.reviewLink}</a>
          </>
        )}
      </div>
    </div>
  )
}
