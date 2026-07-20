# Water Treatment Quoting App — Plan

Cross-platform (iOS + Android) quoting tool for field sales and office staff at a water treatment business.

## Goal

Let a tech walk into a home, capture water/test and site details, build an accurate quote in minutes, and send it for customer review/signature — without spreadsheet math or office callbacks.

---

## Users

| Role | Needs |
|------|--------|
| Field tech / salesperson | Fast quote on-site, offline-tolerant, photo capture, send PDF/link |
| Office / owner | Catalog & pricing control, quote status, approvals, reporting |
| Customer (light) | View quote on phone, accept/decline, optionally e-sign |

Primary focus for v1: **field tech + office admin**. Customer portal can be a shareable web link first (no app install).

---

## Core job-to-be-done

1. Start quote → customer + address  
2. Enter water test results + site conditions  
3. Recommend / select system package (softener, carbon, RO, UV, iron, etc.)  
4. Adjust options, labor, discounts, financing  
5. Preview → send PDF or link → track accepted / expired / won  

---

## Recommended product shape

**One mobile app (iOS + Android) + thin admin web for pricing.**

| Surface | Purpose |
|---------|---------|
| Mobile app | Create quotes in the field |
| Admin web (desktop) | Products, price books, users, report exports |
| Customer link | View/accept quote in browser (no store listing required) |

Avoid building three full apps. Mobile is the product; admin and customer views stay simple.

---

## Tech recommendation

**Expo (React Native) + TypeScript** for the mobile app.

Why this fits a water-treatment quoting tool:

- One codebase for iOS and Android  
- Fast iteration; OTA updates for pricing/UI tweaks  
- Strong ecosystem for forms, PDF, camera, offline storage  
- Easy to share types with a Node/TypeScript backend  

**Backend:** Supabase (Postgres + Auth + Storage) or Firebase — pick one managed BaaS to avoid standing up infra early.

**Suggested default stack**

| Layer | Choice |
|-------|--------|
| Mobile | Expo + TypeScript |
| Admin web | Next.js (same repo / monorepo) |
| API / DB | Supabase (Postgres, Auth, Row Level Security, Storage) |
| PDF | Server-generated PDF (or client lib) from quote template |
| Offline | Local SQLite / WatermelonDB or Expo SQLite; sync when online |
| E-sign | Simple accept button + optional typed signature first; DocuSign later if needed |

**Alternatives considered**

- **Flutter** — fine if team prefers Dart; similar cross-platform story  
- **Fully native** — higher cost, little benefit for a forms/PDF app  
- **PWA only** — weaker camera/offline and store presence; OK as customer quote viewer only  

---

## Domain model (water treatment–specific)

### Quote

- Customer name, phone, email, service address  
- Source (well / municipal / cistern)  
- Occupants / bathrooms (sizing inputs)  
- Status: `draft` → `sent` → `viewed` → `accepted` | `declined` | `expired`  
- Line items, totals, tax, discounts, notes  
- Photos (under-sink, softener niche, well head, meter)  
- Validity date, salesperson, optional financing term  

### Water test snapshot

Typical fields (configurable per company):

- Hardness (gpg or ppm)  
- Iron, manganese  
- pH, TDS  
- Chlorine / chloramine  
- Hydrogen sulfide (smell)  
- Turbidity / sediment notes  
- Lab vs in-home test flag + date  

### Catalog

- Products: softener, conditioner, carbon, sediment, RO, UV, iron filter, salt, media, parts  
- Packages / “systems” that bundle products + labor  
- Labor SKUs (install softener, plumb RO, haul-away)  
- Price books (residential vs commercial; region if needed)  
- Sizing rules (e.g. hardness × people → grain capacity) — start as **lookup tables / guided picks**, not a black-box AI  

### Rules engine (v1 = simple)

Encode common sizing as editable rules, for example:

- Softener grain capacity from hardness + people + peak usage  
- RO when TDS / taste / specific contaminants  
- Iron filter when Fe above threshold  
- UV when well + bacteria concern  

Techs can override with a required “reason” note so office can audit.

---

## MVP scope (ship this first)

**Must have**

- [ ] Login (email or magic link)  
- [ ] Customer + address on quote  
- [ ] Water test form (company-configurable fields)  
- [ ] Catalog browse + add line items / packages  
- [ ] Manual overrides of qty/price (role-gated)  
- [ ] Totals with tax + discount  
- [ ] Generate PDF quote with company branding  
- [ ] Email or SMS share link to customer  
- [ ] Quote list + search + status  
- [ ] Admin: products, prices, packages, tax rate, company logo  

**Explicitly out of MVP**

- Full CRM / scheduling / inventory  
- Financing applications / credit checks  
- Route optimization  
- Lab integrations  
- Native e-sign vendor  
- Multi-company / franchise portals  

---

## Phase 2+

1. Guided sizing from test results (recommended package)  
2. Offline-first field mode with sync  
3. Customer accept + typed signature on web link  
4. Photo annotations / before-after  
5. QuickBooks / Xero / Jobber / ServiceTitan export or sync  
6. Financing calculators (monthly payment display only)  
7. Commission / close-rate dashboards  
8. Template variants (residential vs commercial)  

---

## Key screens (mobile)

1. **Home** — New Quote, My Quotes, Synced status  
2. **Quote editor** — tabs or steps: Customer → Water Test → System → Review  
3. **Catalog picker** — search, packages first, then à la carte  
4. **PDF preview** — send / copy link  
5. **Settings** — profile, default tax, offline cache info  

Admin web: Products, Packages, Price Books, Users, Quote export CSV.

---

## Quote flow (sequence)

```text
Tech opens app
  → New Quote
  → Customer / site
  → Water test (+ optional photos)
  → Select package or build from catalog
  → Adjust labor / options / discount
  → Preview PDF
  → Send link / email
  → Customer views → Accept / Decline
  → Office sees status; won quotes exported or marked installed
```

---

## Pricing & permissions

| Action | Tech | Manager |
|--------|------|---------|
| Create / send quote | ✓ | ✓ |
| Discount below floor | ✗ | ✓ |
| Edit catalog prices | ✗ | ✓ |
| Delete sent quotes | ✗ | ✓ |
| View all techs’ quotes | ✗ | ✓ |

Discount floors and margin guards prevent underpricing in the field.

---

## Data & security

- Auth via Supabase/Firebase; JWT sessions on device  
- Row-level security: techs see own quotes; managers see company  
- Photos in object storage; signed URLs  
- PDF stored with quote for audit trail  
- No card data in-app (link out to payment processor later if needed)  

---

## Success metrics

- Time from open quote → sent (target: under 10 minutes on a typical softener job)  
- % quotes sent same visit  
- Close rate by package / tech  
- Price override frequency (should stay low if catalog/rules are good)  

---

## Build order

1. **Domain + schema** — customers, quotes, line items, products, water tests  
2. **Admin catalog** — seed real products/prices from your current price list  
3. **Mobile quote draft** — forms + line items + totals  
4. **PDF + share**  
5. **Status tracking + customer view link**  
6. **Sizing helpers + offline**  

Do not start with polish, animations, or a customer marketing site. Catalog accuracy and quote math are the product.

---

## Decisions to confirm before coding

1. **Company details:** brand name, logo, tax rules, service areas  
2. **Current quote process:** spreadsheet, paper, Jobber, etc.? What must the PDF look like?  
3. **Catalog:** can you export a price list (CSV) of products + packages?  
4. **Users:** how many field techs at launch?  
5. **Must-offline?** rural well sites with bad signal — yes/no for v1  
6. **Integrations:** any CRM/accounting that quotes must land in?  
7. **Stack preference:** Expo+Supabase as above, or Flutter / existing vendor stack?  

---

## Suggested repo layout (when implementation starts)

```text
/
  apps/
    mobile/          # Expo app
    admin/           # Next.js price/catalog admin
    customer-web/    # optional; or route inside admin
  packages/
    shared/          # types, quote math, sizing rules
  docs/
    quoting-app-plan.md
```

---

## Bottom line

Build an **Expo mobile quoting app** backed by **Postgres (Supabase)**, with a small **admin web** for catalog/pricing and a **shareable customer link** for accept/decline. MVP = accurate catalog + water-test capture + PDF send. Add guided sizing and offline after the quote loop is trusted in the field.
