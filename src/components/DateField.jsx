import { useEffect, useState } from 'react'
import { IconCalendar } from './icons'
import { formatDate } from '../lib/format'

// A date input that DISPLAYS MM/DD/YYYY (typed or picked) and STORES ISO
// (YYYY-MM-DD). The calendar button opens the native date picker.
export default function DateField({ value, onChange, placeholder = 'MM/DD/YYYY' }) {
  const [text, setText] = useState(formatDate(value))

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

  return (
    <div className="date-row">
      <input
        className="input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => commitText(e.target.value)}
      />
      <label className="date-icon-btn" title="Pick a date">
        <IconCalendar />
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  )
}
