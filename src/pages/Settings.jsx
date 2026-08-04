import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useToast } from '../components/Toast'
import {
  IconSave,
  IconBuilding,
  IconPen,
  IconImage,
  IconNote,
  IconGlobe,
  IconUpload,
} from '../components/icons'

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function Field({ label, children, full }) {
  return (
    <div className="field" style={full ? { gridColumn: '1 / -1' } : undefined}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function Settings() {
  const { settings, updateSettings } = useStore()
  const notify = useToast()
  const [form, setForm] = useState(settings)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleFile = async (key, file) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      notify('Image too large (max 2MB)')
      return
    }
    const dataUrl = await readAsDataURL(file)
    set({ [key]: dataUrl })
  }

  const handleSave = () => {
    updateSettings(form)
    notify('Settings saved')
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Configure your practice details for receipts</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <IconSave /> Save Settings
          </button>
        </div>
      </div>

      {/* Practice Information */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">
          <IconBuilding /> Practice Information
        </h3>
        <div className="settings-grid">
          <Field label="Provider / Legal Name">
            <input
              className="input"
              placeholder="e.g., Bright Smiles Orthodontics, Inc."
              value={form.providerName}
              onChange={(e) => set({ providerName: e.target.value })}
            />
          </Field>
          <Field label="TIN / EIN">
            <input
              className="input"
              placeholder="e.g., 12-3456789"
              value={form.tin}
              onChange={(e) => set({ tin: e.target.value })}
            />
          </Field>
          <Field label="Address" full>
            <input
              className="input"
              placeholder="Street, City, State ZIP"
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              placeholder="(555) 555-5555"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
          </Field>
          <Field label="Fax">
            <input
              className="input"
              placeholder="(555) 555-5555"
              value={form.fax}
              onChange={(e) => set({ fax: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              placeholder="hello@yourpractice.com"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <input
              className="input"
              placeholder="www.yourpractice.com"
              value={form.website}
              onChange={(e) => set({ website: e.target.value })}
            />
          </Field>
          <Field label="Receipt Number Prefix">
            <input
              className="input"
              placeholder="RCP"
              value={form.receiptPrefix}
              onChange={(e) => set({ receiptPrefix: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Doctor Information */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">
          <IconPen /> Doctor Information
        </h3>
        <div className="settings-grid">
          <Field label="Doctor Name">
            <input
              className="input"
              placeholder="Dr. Jane Doe, DMD, MS"
              value={form.doctorName}
              onChange={(e) => set({ doctorName: e.target.value })}
            />
          </Field>
          <Field label="Doctor Title">
            <input
              className="input"
              placeholder="Founder and Orthodontist"
              value={form.doctorTitle}
              onChange={(e) => set({ doctorTitle: e.target.value })}
            />
          </Field>
          <Field label="Digital Signature" full>
            <div className="upload-box">
              <div className="upload-preview">
                {form.signature ? (
                  <img src={form.signature} alt="Signature" />
                ) : (
                  <span className="placeholder">No signature uploaded</span>
                )}
              </div>
              <label className="btn btn-ghost upload-btn">
                <IconUpload /> {form.signature ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile('signature', e.target.files?.[0])}
                />
              </label>
              {form.signature && (
                <button className="btn btn-danger-ghost" onClick={() => set({ signature: '' })}>
                  Remove
                </button>
              )}
            </div>
          </Field>
        </div>
      </div>

      {/* Logo & Branding */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">
          <IconImage /> Logo &amp; Branding
        </h3>
        <div className="upload-box">
          <div className="upload-preview">
            {form.logo ? (
              <img src={form.logo} alt="Logo" />
            ) : (
              <span className="placeholder">No logo uploaded</span>
            )}
          </div>
          <label className="btn btn-ghost upload-btn">
            <IconUpload /> {form.logo ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile('logo', e.target.files?.[0])}
            />
          </label>
          {form.logo && (
            <button className="btn btn-danger-ghost" onClick={() => set({ logo: '' })}>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Transition Note */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">
          <IconNote /> Transition Note (Optional)
        </h3>
        <Field label="Note Text">
          <textarea
            className="textarea"
            placeholder="e.g., While services were initially rendered under [prior practice], the practice has since transitioned to [new practice]…"
            value={form.transitionNote}
            onChange={(e) => set({ transitionNote: e.target.value })}
          />
        </Field>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          When enabled on a receipt, this note appears in the Certification
          section. You can toggle it per receipt.
        </div>
      </div>

      {/* Google Maps Review Link */}
      <div className="card card-pad form-card">
        <h3 className="form-section-title">
          <IconGlobe /> Google Maps Review Link
        </h3>
        <Field label="Google Maps Business Link">
          <input
            className="input"
            placeholder="https://maps.app.goo.gl/..."
            value={form.reviewLink}
            onChange={(e) => set({ reviewLink: e.target.value })}
          />
        </Field>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
          This link will be included when sharing receipts with patients for
          review requests.
        </div>
      </div>
    </div>
  )
}
