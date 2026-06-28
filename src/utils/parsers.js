// parsers.js
// Simple rule-based parsers for demo bill types. Each parser exposes:
// - company
// - type
// - parse(text) -> {invoice, date, total, ...}
// - score(text) -> number (higher = better match)

const acme = {
  company: 'Acme Corp',
  type: 'acme_invoice',
  score: (t) => (t.includes('ACME CORP') || t.includes('Acme')) ? 2 : 0,
  parse: (t) => {
    const invoice = (t.match(/Invoice\s*#?:?\s*(\S+)/i) || [])[1]
    const date = (t.match(/Date\s*[:\-]?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) || [])[1]
    const total = (t.match(/Total\s*[:\-]?\s*\$?\s*([0-9,.]+)/i) || [])[1]
    return { invoice, date, total }
  }
}

const beta = {
  company: 'Beta Ltd',
  type: 'beta_invoice',
  score: (t) => (t.includes('BETA LTD') || t.includes('Beta Ltd')) ? 2 : 0,
  parse: (t) => {
    const invoice = (t.match(/Inv(?:oice)?\s*No\.?\s*[:\-]?\s*(\S+)/i) || [])[1]
    const date = (t.match(/Bill Date\s*[:\-]?\s*(\d{1,2}-\d{1,2}-\d{2,4})/i) || [])[1]
    const total = (t.match(/Amount Due\s*[:\-]?\s*\$?\s*([0-9,.]+)/i) || [])[1]
    return { invoice, date, total }
  }
}

// generic fallback
const generic = {
  company: 'Unknown',
  type: 'generic',
  score: (t) => 1,
  parse: (t) => {
    const invoice = (t.match(/invoice\s*[#:]?\s*(\S+)/i) || [])[1]
    const date = (t.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/) || [])[1]
    const total = (t.match(/\$\s*([0-9,.]+)/) || [])[1]
    return { invoice, date, total }
  }
}

export default { acme, beta, generic }
