import { NavLink } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { initialsFrom } from '../lib/format'
import {
  IconDashboard,
  IconFilePlus,
  IconReceipt,
  IconSettings,
  IconUpload,
} from './icons'

const links = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/new', label: 'New Receipt', icon: IconFilePlus },
  { to: '/import', label: 'Import Statement', icon: IconUpload },
  { to: '/history', label: 'Receipt History', icon: IconReceipt },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

export default function Sidebar() {
  const { settings } = useStore()
  const brandName = settings.providerName?.split('(')[0].trim() || 'Receipt Manager'
  const shortName =
    brandName.length > 22 ? brandName.slice(0, 20).trim() + '…' : brandName

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {settings.logo ? (
          <img
            src={settings.logo}
            alt="logo"
            className="brand-avatar"
            style={{ objectFit: 'cover', background: '#fff' }}
          />
        ) : (
          <div className="brand-avatar">{initialsFrom(settings.providerName)}</div>
        )}
        <div>
          <div className="brand-name">{shortName}</div>
          <div className="brand-sub">Receipt Manager</div>
        </div>
      </div>

      <nav className="nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {settings.providerName?.split('(')[0].trim() || 'Dental / Ortho Practice'}
        <br />
        FSA/HSA Receipt Generator
      </div>
    </aside>
  )
}
