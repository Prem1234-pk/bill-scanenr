// parsers.js
// Simple rule-based parsers for demo bill types. Each parser exposes:
// - company
// - type
// - parse(text) -> {invoice, date, total, ...}
// - score(text) -> number (higher = better match)

const parseInvoice = (t) => (t.match(/(?:Invoice|Inv(?:oice)?)\s*(?:#|No\.?|No)?\s*[:#]?\s*(\S+)/i) || [])[1] || ''
const parseDate = (t) => (t.match(/(?:Date|Bill Date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) || [])[1] || ''
const parseTotal = (t) => (t.match(/(?:Total|Amount Due)\s*[:\-]?\s*\$?\s*([0-9,.]+)/i) || [])[1] || ''

const makeCompanyParser = (company, type, matcher) => ({
  company,
  type,
  score: (t) => matcher(t.toUpperCase()) ? 2 : 0,
  parse: (t) => ({ invoice: parseInvoice(t), date: parseDate(t), total: parseTotal(t) }),
})

const acme = makeCompanyParser('Acme Corp', 'acme_invoice', (u) => /\bACME\b/.test(u))
const beta = makeCompanyParser('Beta Ltd', 'beta_invoice', (u) => /\bBETA\b/.test(u))
const gamma = makeCompanyParser('Gamma Inc', 'gamma_invoice', (u) => /\bGAMMA\b/.test(u))
const delta = makeCompanyParser('Delta Co', 'delta_invoice', (u) => /\bDELTA\b/.test(u))
const epsilon = makeCompanyParser('Epsilon LLC', 'epsilon_invoice', (u) => /\bEPSILON\b/.test(u))
const zeta = makeCompanyParser('Zeta Systems', 'zeta_invoice', (u) => /\bZETA\b/.test(u))
const theta = makeCompanyParser('Theta Enterprises', 'theta_invoice', (u) => /\bTHETA\b/.test(u))
const iota = makeCompanyParser('Iota Logistics', 'iota_invoice', (u) => /\bIOTA\b/.test(u))
const kappa = makeCompanyParser('Kappa Holdings', 'kappa_invoice', (u) => /\bKAPPA\b/.test(u))
const lambda = makeCompanyParser('Lambda Products', 'lambda_invoice', (u) => /\bLAMBDA\b/.test(u))

const generic = {
  company: 'Unknown',
  type: 'generic',
  score: (t) => {
    const hasInvoice = /(?:Invoice|Inv(?:oice)?)\s*(?:#|No\.?|No)?\s*[:#]?\s*\S+/i.test(t)
    const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t)
    const hasTotal = /\$\s*[0-9,.]+/.test(t)
    return hasInvoice && hasDate && hasTotal ? 1 : 0
  },
  parse: (t) => ({ invoice: parseInvoice(t), date: parseDate(t), total: parseTotal(t) }),
}

export default { acme, beta, gamma, delta, epsilon, zeta, theta, iota, kappa, lambda, generic }
