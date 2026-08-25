import { useEffect, useRef, useState } from 'react'
import { IconCalendar } from './icons'
import { formatDate } from '../lib/format'

// A date input that DISPLAYS MM/DD/YYYY (typed or picked) and STORES ISO
// (YYYY-MM-DD). The calendar button opens the native date picker.
export default function DateField({ value, onChange, placeholder = 'MM/DD/YYYY' }) {
  const [text, setText] = useState(formatDate(value))
  const dateRef = useRef(null)

  useEffect(() => {
    setText(formatDate(value))
  }, [value])

  const commitText = (raw) => {
    setText(raw)
    // Try to parse MM/DD/YYYY into ISO
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim())
    if (m) {
      const [, mm, dd, yyyy] = m
      onChange(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`)
    } else if (raw.trim() === '') {
      onChange('')
    }
  }

  // Open the browser's native date picker. showPicker() is the reliable way;
  // fall back to focus()+click() for older browsers.
  const openPicker = () => {
    const el = dateRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus()
      el.click()
    }
  }

  return (
    <div className="date-row">
      <input
        className="input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => commitText(e.target.value)}
      />
      <button
        type="button"
        className="date-icon-btn"
        title="Pick a date"
        onClick={openPicker}
      >
        <IconCalendar />
        {/* Hidden native date input driven by the button above. */}
        <input
          ref={dateRef}
          type="date"
          className="date-native"
          value={value || ''}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => onChange(e.target.value)}
        />
      </button>
    </div>
  )
}
