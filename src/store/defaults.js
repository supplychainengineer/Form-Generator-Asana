// Default/seed data for the FSA/HSA Receipt Generator.
// Everything here is GENERIC so any dental / orthodontic practice can use the
// app out of the box — configure your own details on the Settings page.

export const defaultSettings = {
  // Practice information
  providerName: '',
  tin: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',

  // Doctor information
  doctorName: '',
  doctorTitle: '',
  signature: '', // data URL of an uploaded signature image

  // Branding
  logo: '', // data URL of an uploaded logo image

  // Optional transition note (toggled per-receipt)
  transitionNote: '',

  // Google Maps review link (included when sharing receipts)
  reviewLink: '',

  // Prefix used when auto-numbering receipts, e.g. RCP-202608-0004
  receiptPrefix: 'RCP',
}

// Payment-status options shown in the New Receipt form.
export const paymentStatusOptions = [
  'Full Payment',
  'Partial Payment',
  'Payment Plan',
  'Paid in Full (Prior)',
]

// A few neutral sample receipts so the Dashboard / History aren't empty on first
// run. Delete them any time — your own receipts are stored the same way.
export const sampleReceipts = [
  {
    id: 'seed-1',
    receiptNumber: 'RCP-202608-0004',
    receiptDate: '2026-08-04',
    patientName: 'Jordan Miller',
    patientAddress: '128 Maple Street, Springfield, IL 62701',
    responsibleType: 'self',
    responsibleName: '',
    serviceDescription: 'Adult Comprehensive (D8090)',
    contractDate: '2026-01-15',
    appliancePlaced: '2026-02-01',
    paymentStatus: 'Full Payment',
    payments: [{ date: '2026-08-04', amount: 1000.01, label: 'Orthodontic Treatment' }],
    includeTransitionNote: false,
    createdAt: '2026-08-04T10:00:00.000Z',
  },
  {
    id: 'seed-2',
    receiptNumber: 'RCP-202608-0003',
    receiptDate: '2026-08-04',
    patientName: 'Priya Sharma',
    patientAddress: '44 Oak Avenue, Madison, WI 53703',
    responsibleType: 'other',
    responsibleName: 'Anil Sharma',
    serviceDescription: 'Retainers',
    contractDate: '',
    appliancePlaced: '',
    paymentStatus: 'Full Payment',
    payments: [{ date: '2026-08-04', amount: 570.0, label: 'Orthodontic Treatment' }],
    includeTransitionNote: false,
    createdAt: '2026-08-04T09:30:00.000Z',
  },
  {
    id: 'seed-3',
    receiptNumber: 'RCP-202607-0002',
    receiptDate: '2026-07-30',
    patientName: 'Alessandra Rodas',
    patientAddress: '900 Pine Road, Austin, TX 78701',
    responsibleType: 'other',
    responsibleName: 'Veronica Garcia-Rodas',
    serviceDescription: 'Retainers',
    contractDate: '',
    appliancePlaced: '',
    paymentStatus: 'Full Payment',
    payments: [{ date: '2026-07-30', amount: 370.0, label: 'Orthodontic Treatment' }],
    includeTransitionNote: false,
    createdAt: '2026-07-30T14:00:00.000Z',
  },
  {
    id: 'seed-4',
    receiptNumber: 'RCP-202607-0001',
    receiptDate: '2026-07-28',
    patientName: 'Cynthia Wong',
    patientAddress: '17 Birch Lane, Seattle, WA 98101',
    responsibleType: 'self',
    responsibleName: '',
    serviceDescription: 'Teen Comprehensive (D8080)',
    contractDate: '2025-11-10',
    appliancePlaced: '2025-12-01',
    paymentStatus: 'Payment Plan',
    payments: [
      { date: '2026-01-15', amount: 882.33, label: 'Installment 1' },
      { date: '2026-07-28', amount: 882.33, label: 'Installment 2' },
    ],
    includeTransitionNote: false,
    createdAt: '2026-07-28T11:00:00.000Z',
  },
]
