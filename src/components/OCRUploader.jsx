import React, { useState } from 'react'
import Tesseract from 'tesseract.js'
import parsers from '../utils/parsers'

export default function OCRUploader({ onRecord }) {
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const samples = [
    { name: 'Acme Corp - Sample', url: '/samples/acme-bill.svg' },
    { name: 'Beta Ltd - Sample', url: '/samples/beta-bill.svg' },
  ]

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) setFile(URL.createObjectURL(f))
  }

  const runOCR = async (imageUrl) => {
    try {
      setBusy(true)
      setProgress(0)
      const worker = Tesseract.createWorker({
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      await worker.load()
      await worker.loadLanguage('eng')
      await worker.initialize('eng')
      const { data } = await worker.recognize(imageUrl)
      await worker.terminate()
      setProgress(100)
      return data.text
    } finally {
      setBusy(false)
    }
  }

  const handleScan = async () => {
    const image = file
    if (!image) return alert('Pick a sample or upload an image first')
    const text = await runOCR(image)
    // try all parsers and pick the one with best match
    const results = Object.keys(parsers).map((key) => ({
      key,
      parsed: parsers[key].parse(text),
      score: parsers[key].score(text),
    }))
    results.sort((a, b) => b.score - a.score)
    const best = results[0]
    if (!best || best.score <= 0) {
      alert('Could not detect bill type. Try another sample or improve parser rules.')
      return
    }
    const rec = {
      company: parsers[best.key].company,
      type: parsers[best.key].type,
      rawText: text,
      fields: best.parsed,
      sampleImage: image,
    }
    onRecord(rec)
  }

  return (
    <section className="uploader">
      <h2>Scan / Upload</h2>
      <div className="controls">
        <div>
          <label>Pick sample:</label>
          <select onChange={(e) => setFile(e.target.value)} defaultValue="">
            <option value="">-- none --</option>
            {samples.map((s) => (
              <option key={s.url} value={s.url}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Or upload image:</label>
          <input type="file" accept="image/*" onChange={handleFile} />
        </div>

        <div>
          <button onClick={handleScan} disabled={busy || !file}>{busy ? `Scanning ${progress}%` : 'Scan'}</button>
        </div>
      </div>

      <div className="preview">
        {file ? <img src={file} alt="preview" /> : <div className="placeholder">No image selected</div>}
      </div>
    </section>
  )
}
