import React, { useState, useEffect } from 'react'
import OCRUploader from './components/OCRUploader'
import Dashboard from './components/Dashboard'

export default function App() {
  const [records, setRecords] = useState([]) // {id, company, type, fields}

  useEffect(() => {
    localStorage.removeItem('bill_scanner_records')
  }, [])

  const addRecord = (rec) => {
    const normalizedCompany = String(rec.company || '').trim()
    const normalizedInvoice = String(rec.fields?.invoice || '').trim()

    setRecords((prev) => {
      if (
        normalizedCompany &&
        normalizedInvoice &&
        prev.some(
          (r) =>
            String(r.company || '').trim() === normalizedCompany &&
            String(r.fields?.invoice || '').trim() === normalizedInvoice
        )
      ) {
        return prev
      }
      return [{ id: Date.now().toString(), ...rec }, ...prev]
    })
  }

  return (
    <div className="app">
      <header>
        <h1>Bill Scanner (client-side)</h1>
        <p>Upload or pick a sample bill, scan with OCR, and export sheets per company/type.</p>
      </header>

      <main>
        <OCRUploader onRecord={addRecord} />
        <Dashboard records={records} setRecords={setRecords} />
      </main>

      <footer>
        <small>Pure client-side demo — Tesseract.js + SheetJS. No server.</small>
      </footer>
    </div>
  )
}
