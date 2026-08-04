import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { formatCurrency, formatDate } from '../lib/format'
import {
  IconReceipt,
  IconDollar,
  IconCalendar,
  IconFilePlus,
  IconEye,
  IconArrowRight,
} from '../components/icons'

function StatCard({ tone, icon: Icon, label, value }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { stats, sortedReceipts, settings, receiptTotal } = useStore()
  const navigate = useNavigate()
  const recent = sortedReceipts.slice(0, 5)
  const practice = settings.providerName?.split('(')[0].trim() || 'Your Practice'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">{practice} Receipt Overview</div>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            <IconFilePlus /> New Receipt
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="purple"
          icon={IconReceipt}
          label="Total Receipts"
          value={stats.count}
        />
        <StatCard
          tone="green"
          icon={IconDollar}
          label="Total Collected"
          value={formatCurrency(stats.totalCollected)}
        />
        <StatCard
          tone="amber"
          icon={IconCalendar}
          label="This Month"
          value={stats.thisMonth}
        />
      </div>

      <div className="card card-pad">
        <div className="section-head">
          <h2 className="section-title">Recent Receipts</h2>
          <button className="link-btn" onClick={() => navigate('/history')}>
            View All <IconArrowRight />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <IconReceipt />
            <div>No receipts yet. Create your first one.</div>
          </div>
        ) : (
          recent.map((r) => (
            <div className="recent-row" key={r.id}>
              <div className="recent-icon">
                <IconReceipt />
              </div>
              <div className="recent-main">
                <div className="recent-name">{r.patientName}</div>
                <div className="recent-num">{r.receiptNumber}</div>
              </div>
              <div className="recent-right">
                <div className="recent-amount">
                  {formatCurrency(receiptTotal(r))}
                </div>
                <div className="recent-date">{formatDate(r.receiptDate)}</div>
              </div>
              <button
                className="icon-btn"
                title="View receipt"
                onClick={() => navigate(`/new?id=${r.id}`)}
              >
                <IconEye />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
