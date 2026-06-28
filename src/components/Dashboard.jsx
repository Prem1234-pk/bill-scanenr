import React, { useMemo, useState } from 'react'
import Select from 'react-select'
import * as XLSX from 'xlsx'

export default function Dashboard({ records, setRecords }) {
  const [selectedCompanies, setSelectedCompanies] = useState([])

  const companies = useMemo(() => {
    const s = Array.from(new Set(records.map((r) => r.company)))
    return s.map((c) => ({ label: c, value: c }))
  }, [records])

  const filtered = useMemo(() => {
    if (!selectedCompanies || selectedCompanies.length === 0) return records
    const vals = selectedCompanies.map((c) => c.value)
    return records.filter((r) => vals.includes(r.company))
  }, [records, selectedCompanies])

  const exportExcel = () => {
    // Build workbook with one sheet per company (or per company+type)
    const wb = XLSX.utils.book_new()
    const groups = {}
    for (const r of records) {
      const sheetName = `${r.company}`.slice(0, 31)
      if (!groups[sheetName]) groups[sheetName] = []
      const row = { ...r.fields, rawText: r.rawText }
      groups[sheetName].push(row)
    }
    for (const [sheetName, rows] of Object.entries(groups)) {
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
    XLSX.writeFile(wb, 'bills_export.xlsx')
  }

  const removeRecord = (id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const clearAll = () => {
    if (confirm('Clear all scanned records from this browser?')) {
      setRecords([])
    }
  }

  return (
    <section className="dashboard">
      <h2>Dashboard</h2>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ width: 300 }}>
          <label>Filter by company (multi):</label>
          <Select
            isMulti
            options={companies}
            value={selectedCompanies}
            onChange={setSelectedCompanies}
          />
        </div>

        <div>
          <button onClick={exportExcel} disabled={records.length === 0}>Export Excel (sheets per company)</button>
        </div>

        <div>
          <button onClick={clearAll} disabled={records.length === 0}>Clear</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Type</th>
              <th>Invoice</th>
              <th>Date</th>
              <th>Total</th>
              <th>Raw text (preview)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.company}</td>
                <td>{r.type}</td>
                <td>{r.fields.invoice || ''}</td>
                <td>{r.fields.date || ''}</td>
                <td>{r.fields.total || ''}</td>
                <td><pre style={{ maxWidth: 300, overflow: 'auto' }}>{String(r.rawText).slice(0, 150)}</pre></td>
                <td>
                  <button type="button" onClick={() => removeRecord(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
