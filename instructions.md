You are a senior frontend + backend engineer. Build a professional, production-ready feature for exporting filtered user data to PDF and Excel.

⚠️ PRIORITIES (NON-NEGOTIABLE)
- Performance first (large datasets must not freeze UI)
- Security (no sensitive data leaks, validate all inputs)
- UX/UI clarity (any non-technical user must understand it instantly)
- Clean, modular architecture (NO file > 250 lines)
- Reusability and scalability

---

## 🎯 FEATURE GOAL

Create a "User Export Module" where users can:

1. Apply filters
2. Choose which fields to include
3. Export results to:
   - PDF
   - Excel

---

## 🧠 UX REQUIREMENTS (VERY IMPORTANT)

Design the UI so it feels:
- Minimal
- Self-explanatory
- Fast

### UX Behavior:
- Use a **step-based or grouped UI**:
  1. Filters
  2. Fields selection
  3. Export options

- Use:
  - Toggles (for including fields)
  - Clear labels (no technical jargon)
  - Tooltips where needed
  - Smart defaults

- Show:
  - Preview count (e.g., "23 results")
  - Loading states
  - Disabled export button if no data

---

## 🔍 FILTERS TO IMPLEMENT

Filters must be efficient and scalable.

Fields:

- CUIT → NOT a filter, just a toggle (include in export or not)
- Dirección
- Tipo de factura (A | B)
- Plazo de pago
- Valores de última vigencia
- Emails
- Teléfono

Make filters:
- Debounced
- Server-side ready (design prepared even if mocked)
- Indexed-friendly (explain in backend)

---

## 📤 EXPORT REQUIREMENTS

### Excel:
- Use `exceljs` or `xlsx`
- Proper column headers
- Auto width
- Formatting for:
  - Numbers
  - Dates

### PDF:
- Use `jspdf` + `jspdf-autotable`
- Clean table layout
- Title + metadata (date, filters applied)

---

## ⚡ PERFORMANCE REQUIREMENTS

- Use virtualization if list is large (`react-virtuoso`)
- Avoid unnecessary re-renders
- Use `react-query` for data fetching
- Memoize heavy computations
- Export generation must NOT block UI (use async or workers if possible)

---

## 🔐 SECURITY REQUIREMENTS

- Validate all filter inputs
- Never expose hidden fields
- Sanitize exported content
- Prevent injection (especially in PDF/Excel)

---

## 🧱 TECH STACK (USE THESE)

Frontend:
- React 19
- MUI (Material UI)
- React Query
- Axios
- Framer Motion (subtle animations)
- SCSS modules or emotion

Export:
- exceljs / xlsx
- jspdf + autotable
- file-saver

---

## 🧩 ARCHITECTURE

Split into modules:

- `/components/export/`
  - ExportPanel.tsx
  - FiltersSection.tsx
  - FieldSelector.tsx
  - ExportButtons.tsx

- `/hooks/`
  - useExportData.ts
  - useFilters.ts

- `/services/`
  - exportService.ts

- `/utils/`
  - formatters.ts
  - validators.ts

NO file > 250 lines.

---

## 📦 OUTPUT EXPECTATION

Provide:

1. Full frontend implementation
2. Mock backend (or real FastAPI-ready structure)
3. Clean reusable hooks
4. Export utilities
5. Example of API contract
6. Comments where backend integration is needed

---

## ✨ BONUS (IF POSSIBLE)

- Add "Save filter preset"
- Add "Last export config"
- Add export progress indicator

---

Think like you're building for a real medical/administrative system used daily by non-technical staff.