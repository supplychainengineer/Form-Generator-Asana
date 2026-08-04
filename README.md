# FSA/HSA Dental Receipt Generator

A self-contained web app for dental & orthodontic practices to generate
**FSA/HSA-compliant payment receipts**. It's a faithful, **generic** recreation
of the "Receipt Manager" app — no practice branding is hard-coded, so **anybody
can configure it for their own practice and use it locally**.

Everything runs in your browser. There is **no backend, no database, and no
account** — all data is stored locally in your browser's `localStorage`.

## Features

- **Dashboard** — total receipts, total collected, receipts this month, and a
  list of recent receipts.
- **New Receipt** — build an FSA/HSA receipt with:
  - Receipt date, patient name & address
  - Responsible party (Self / Other Person)
  - Service description, contract date, appliance-placed date
  - Payment status + one or more payments (with a one-click "Payment Plan")
  - Live total
  - Optional practice transition note (toggled per receipt)
  - **Show Preview** of the finished receipt
  - **PDF** — one-click download of a real PDF file (generated in-browser
    with jsPDF; no print dialog). Also available per row in Receipt History.
  - **Save Receipt**
- **Receipt History** — searchable, sortable table of all receipts with view,
  edit, delete, and **Export CSV**.
- **Settings** — configure everything that appears on receipts:
  - Practice information (provider/legal name, TIN/EIN, address, phone, fax,
    email, website, receipt-number prefix)
  - Doctor information (name, title, uploadable digital signature)
  - Logo & branding (uploadable logo — also shown in the sidebar)
  - Optional transition note
  - Google Maps review link

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install     # install dependencies
npm run dev     # start the app at http://localhost:3000
```

That's it — the app opens in your browser. Go to **Settings** first to enter
your practice details, then create receipts.

### Other commands

```bash
npm run build     # build a production bundle into dist/
npm run preview   # preview the production build locally
```

## How your data is stored

- Receipts and settings live in your browser under `localStorage`
  (keys prefixed with `aoreceipts.`).
- Data stays on the machine/browser you use it in — nothing is uploaded.
- Uploaded logo/signature images are stored inline (as data URLs), so keep them
  reasonably small (max 2 MB each).
- Clearing your browser data will remove saved receipts. Use **Export CSV** in
  Receipt History to keep a copy.

On first run the app seeds a few neutral **sample receipts** so the dashboard
isn't empty — delete them any time from Receipt History.

## Tech stack

- [React 18](https://react.dev/) + [React Router](https://reactrouter.com/)
- [Vite](https://vitejs.dev/) for dev/build
- [jsPDF](https://github.com/parallax/jsPDF) +
  [html2canvas](https://html2canvas.hertzen.com/) for one-click PDF download
- Plain CSS (no UI framework) and inline SVG icons — zero external runtime
  services, works fully offline once installed.

## Project structure

```
src/
  App.jsx                 # routes + providers
  main.jsx                # entry
  index.css               # all styles (incl. print styles for PDF)
  store/
    StoreContext.jsx      # localStorage-backed state (receipts + settings)
    defaults.js           # generic defaults + sample receipts
  lib/format.js           # currency / date helpers
  components/
    Sidebar.jsx
    DateField.jsx
    ReceiptDocument.jsx   # the printable receipt
    PdfProvider.jsx       # one-click PDF download (jsPDF + html2canvas)
    Toast.jsx
    icons.jsx
  pages/
    Dashboard.jsx
    NewReceipt.jsx
    ReceiptHistory.jsx
    Settings.jsx
```
