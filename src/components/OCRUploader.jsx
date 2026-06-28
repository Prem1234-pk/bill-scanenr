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
    { name: 'Gamma Inc - Sample', url: '/samples/gamma-bill.svg' },
    { name: 'Delta Co - Sample', url: '/samples/delta-bill.svg' },
    { name: 'Epsilon LLC - Sample', url: '/samples/epsilon-bill.svg' },
    { name: 'Zeta Systems - Sample', url: '/samples/zeta-bill.svg' },
    { name: 'Theta Enterprises - Sample', url: '/samples/theta-bill.svg' },
    { name: 'Iota Logistics - Sample', url: '/samples/iota-bill.svg' },
    { name: 'Kappa Holdings - Sample', url: '/samples/kappa-bill.svg' },
    { name: 'Lambda Products - Sample', url: '/samples/lambda-bill.svg' },
  ]

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) setFile(URL.createObjectURL(f))
  }

  const loadImageElement = async (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const ensureRasterImage = async (src) => {
    if (!src.toLowerCase().endsWith('.svg')) {
      return src
    }
    const img = await loadImageElement(src)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 800
    canvas.height = img.naturalHeight || 600
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)

    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl
  }

  const runOCR = async (imageUrl) => {
    let worker
    try {
      setBusy(true)
      setProgress(0)
      const image = await ensureRasterImage(imageUrl)
      worker = await Tesseract.createWorker({
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      await worker.loadLanguage('eng')
      await worker.initialize('eng')
      const { data } = await worker.recognize(image)
      setProgress(100)
      return data.text
    } finally {
      if (worker) {
        try {
          await worker.terminate()
        } catch (err) {
          console.warn('Failed to terminate worker', err)
        }
      }
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
