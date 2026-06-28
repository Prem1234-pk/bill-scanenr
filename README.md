# Bill Scanner (client-side React)

This repository contains a client-side React app (Vite) that demonstrates scanning bills (images) with Tesseract.js, extracting key fields via simple parsers/templates, showing a dashboard with multi-select filters, and exporting the collected bills into an Excel workbook where each company/type is stored in its own sheet.

Notes:
- This is a purely client-side app (no backend). OCR runs in the browser.
- CSV doesn't support multiple sheets — the app exports an .xlsx file (Excel) with one sheet per bill type/company.

Quick start:
1. npm install
2. npm run dev
3. Open http://localhost:5173

What it includes:
- src/: React app source
- public/samples/: two sample bill SVGs you can scan

If you want actual AI-based field extraction (LLM-based), consider adding a secure backend or using a user-provided API key carefully, because calling LLM APIs directly from the browser exposes the key.
