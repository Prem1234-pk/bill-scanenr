import React, { useState, useEffect } from 'react'
import OCRUploader from './components/OCRUploader'
import Dashboard from './components/Dashboard'

export default function App() {
  const [records, setRecords] = useState([]) // {id, company, type, fields}

  useEffect(() => {
    // load demo records from localStorage if present
    const saved = localStorage.getItem('bill_scanner_records')
    if (saved) setRecords(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('bill_scanner_records', JSON.stringify(records))
  }, [records])

  const addRecord = (rec) => {
    setRecords((r) => [{ id: Date.now().toString(), ...rec }, ...r])
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
