import React, { useEffect, useMemo, useState } from 'react'
import Select from 'react-select'
import * as XLSX from 'xlsx'

export default function Dashboard({ records, setRecords }) {
  const [selectedCompanies, setSelectedCompanies] = useState([])

  const companies = useMemo(() => {
    const s = Array.from(new Set(records.map((r) => r.company)))
    return s.map((c) => ({ label: c, value: c }))
  }, [records])

  const [excelHandle, setExcelHandle] = useState(null)
  const [excelMessage, setExcelMessage] = useState('No Excel DB connected')
  const [useLocalExcelDB, setUseLocalExcelDB] = useState(false)
  const [excelDBReady, setExcelDBReady] = useState(false)
  const [skipNextPersist, setSkipNextPersist] = useState(false)

  const filtered = useMemo(() => {
    if (!selectedCompanies || selectedCompanies.length === 0) return records
    const vals = selectedCompanies.map((c) => c.value)
    return records.filter((r) => vals.includes(r.company))
  }, [records, selectedCompanies])

  const verifyPermission = async (handle, mode = 'readwrite') => {
    if (!handle.requestPermission || !handle.queryPermission) return true
    const options = { mode }
    if ((await handle.queryPermission(options)) === 'granted') return true
    if ((await handle.requestPermission(options)) === 'granted') return true
    return false
  }

  const createEmptyWorkbook = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['company', 'type', 'invoice', 'date', 'total', 'rawText']])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    return wb
  }

  const saveWorkbookToHandle = async (handle, wb) => {
    if (!handle) return
    if (!(await verifyPermission(handle, 'readwrite'))) {
      alert('Permission denied for Excel DB file.')
      throw new Error('Excel DB handle write permission denied')
    }
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    try {
      const writable = await handle.createWritable({ keepExistingData: false })
      await writable.write(blob)
      await writable.close()
    } catch (error) {
      console.error('Failed to write Excel DB file handle', error)
      alert('Could not save Excel DB. Close the file in Excel and try again.')
      throw error
    }
  }

  const saveWorkbookToLocalStorage = async (wb) => {
    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      wb = createEmptyWorkbook()
    }
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
    localStorage.setItem('bill_scanner_excel_db', base64)
    setExcelMessage('Excel DB synced to local storage')
  }

  const saveWorkbook = async (wb) => {
    if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
      wb = createEmptyWorkbook()
    }
    if (excelHandle) {
      await saveWorkbookToHandle(excelHandle, wb)
      setExcelMessage(`Excel DB synced to ${excelHandle.name || 'file'}`)
    } else {
      await saveWorkbookToLocalStorage(wb)
    }
  }

  const persistRecordsToExcel = async (items) => {
    const groups = {}
    for (const r of items) {
      const sheetName = `${r.company}`.slice(0, 31)
      if (!groups[sheetName]) groups[sheetName] = []
      groups[sheetName].push({ company: r.company, type: r.type, ...r.fields, rawText: r.rawText })
    }
    let wb
    if (Object.keys(groups).length === 0) {
      wb = createEmptyWorkbook()
    } else {
      wb = XLSX.utils.book_new()
      for (const [sheetName, rows] of Object.entries(groups)) {
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }
    }
    try {
      await saveWorkbook(wb)
    } catch (error) {
      console.warn('Failed to persist Excel workbook', error)
      setExcelMessage('Failed to sync Excel DB. Close the file in Excel and try again.')
      throw error
    }
  }

  useEffect(() => {
    if (!excelDBReady) return
    if (!excelHandle && !useLocalExcelDB) return
    if (skipNextPersist) {
      setSkipNextPersist(false)
      return
    }
    persistRecordsToExcel(records)
  }, [records, excelHandle, useLocalExcelDB, excelDBReady, skipNextPersist])

  const workbookToRecords = (wb) => {
    const result = []
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      rows.forEach((row) => {
        result.push({
          id: `${Date.now()}-${Math.random()}`,
          company: row.company || sheetName,
          type: row.type || 'excel',
          fields: {
            invoice: row.invoice || '',
            date: row.date || '',
            total: row.total || '',
          },
          rawText: row.rawText || '',
        })
      })
    })
    return result
  }

  const loadWorkbookFromHandle = async (handle) => {
    const file = await handle.getFile()
    if (!file || file.size === 0) {
      return null
    }
    const data = await file.arrayBuffer()
    try {
      return XLSX.read(data, { type: 'array' })
    } catch (err) {
      console.warn('Failed to parse Excel file from handle', err)
      throw err
    }
  }

  const handleOpenExcelDB = async () => {
    setExcelDBReady(false)
    setSkipNextPersist(false)
    const openPickerAvailable = !!window.showOpenFilePicker
    const savePickerAvailable = !!window.showSaveFilePicker

    if (openPickerAvailable) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'Excel Workbook',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              },
            },
          ],
        })
        if (!handle) return
        const wb = await loadWorkbookFromHandle(handle)
        if (!wb) {
          const empty = createEmptyWorkbook()
          await saveWorkbookToHandle(handle, empty)
          setRecords([])
          setExcelHandle(handle)
          setUseLocalExcelDB(false)
          setExcelMessage(`Created new Excel DB: ${handle.name || 'bills_db.xlsx'}`)
          setSkipNextPersist(true)
          setExcelDBReady(true)
          return
        }
        const imported = workbookToRecords(wb)
        const nextRecords = records.length > 0 && !confirm('Replace existing records with imported Excel DB records?')
          ? [...imported, ...records]
          : imported
        setSkipNextPersist(true)
        setRecords(nextRecords)
        setExcelHandle(handle)
        setUseLocalExcelDB(false)
        setExcelMessage(`Loaded Excel DB: ${handle.name || 'file'}`)
        setExcelDBReady(true)
      } catch (err) {
        console.warn('Excel DB open canceled or failed', err)
      }
      return
    }

    if (savePickerAvailable) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'bills_db.xlsx',
          types: [
            {
              description: 'Excel Workbook',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              },
            },
          ],
        })
        if (!handle) return
        const wb = await loadWorkbookFromHandle(handle)
        if (!wb) {
          const empty = createEmptyWorkbook()
          await saveWorkbookToHandle(handle, empty)
          setRecords([])
          setExcelHandle(handle)
          setUseLocalExcelDB(false)
          setExcelMessage(`Created new Excel DB: ${handle.name || 'bills_db.xlsx'}`)
          setSkipNextPersist(true)
          setExcelDBReady(true)
          return
        }
        const imported = workbookToRecords(wb)
        const nextRecords = records.length > 0 && !confirm('Replace existing records with imported Excel DB records?')
          ? [...imported, ...records]
          : imported
        setSkipNextPersist(true)
        setRecords(nextRecords)
        setExcelHandle(handle)
        setUseLocalExcelDB(false)
        setExcelMessage(`Loaded Excel DB: ${handle.name || 'file'}`)
        setExcelDBReady(true)
      } catch (err) {
        console.warn('Excel DB open canceled or failed', err)
      }
      return
    }

    const stored = localStorage.getItem('bill_scanner_excel_db')
    setExcelHandle(null)
    setUseLocalExcelDB(true)
    if (!stored) {
      const wb = createEmptyWorkbook()
      await saveWorkbookToLocalStorage(wb)
      setRecords([])
      setExcelMessage('Created new local Excel DB')
      setSkipNextPersist(true)
      setExcelDBReady(true)
      return
    }
    let wb
    try {
      wb = XLSX.read(stored, { type: 'base64' })
    } catch (err) {
      console.warn('Failed to parse local Excel DB from storage', err)
      const empty = createEmptyWorkbook()
      await saveWorkbookToLocalStorage(empty)
      setRecords([])
      setUseLocalExcelDB(true)
      setSkipNextPersist(true)
      setExcelMessage('Reset corrupted local Excel DB and created a new one')
      setExcelDBReady(true)
      return
    }
    const imported = workbookToRecords(wb)
    if (records.length > 0 && !confirm('Replace existing records with local Excel DB records?')) {
      setRecords((prev) => [...imported, ...prev])
    } else {
      setRecords(imported)
    }
    setExcelMessage('Loaded local Excel DB')
    setSkipNextPersist(true)
    setExcelDBReady(true)
  }

  const removeRecord = async (id) => {
    const nextRecords = records.filter((r) => r.id !== id)
    setRecords(nextRecords)
    if (excelHandle || useLocalExcelDB) {
      try {
        await persistRecordsToExcel(nextRecords)
        setExcelMessage(`Excel DB synced after deleting record from ${excelHandle?.name || 'local storage'}`)
      } catch (error) {
        console.warn('Failed to persist Excel after delete', error)
      }
    }
  }

  const clearAll = async () => {
    if (confirm('Clear all scanned records from this browser?')) {
      setRecords([])
      if (excelHandle || useLocalExcelDB) {
        try {
          await persistRecordsToExcel([])
          setExcelMessage(`Excel DB synced after clearing all records from ${excelHandle?.name || 'local storage'}`)
        } catch (error) {
          console.warn('Failed to persist Excel after clear', error)
        }
      }
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" onClick={handleOpenExcelDB}>Use Excel DB</button>
          <span style={{ fontSize: '0.9rem', color: '#555' }}>{excelMessage}</span>
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
