# Velora POS - Phase 2 Tasks

## 1. Multi-tenant & Auth
- [ ] Implement Superadmin/Tenant Admin/Cashier roles.
- [ ] Isolation of data based on `tenant_id`.

## 2. Configuration & Settings
- [ ] Business Data CRUD (Logo, NIT, Address).
- [ ] User Management CRUD (Cashiers).
- [ ] POS Hardware setup (Printer, Barcode, Drawer).
- [ ] Bank Accounts CRUD for transfers.

## 3 & 4. Advanced Payments
- [ ] Mixed Payments Logic (Cash + Card + Transfer).
- [ ] Dynamic Transfer account selection.
- [ ] Credit (Fiado) with associate client and abonos.

## 5. Inventory & Products
- [ ] Fix Inventory CRUD to persist in Supabase.
- [ ] Auto-generate unique barcodes/SKUs.
- [ ] Parent/Child fractional product logic.
- [ ] Add IA text fields (Benefits, Symptoms, Ingredients).

## 6. Client CRM
- [ ] Fix Client CRUD.
- [ ] Integrate Client search/creation in POS.

## 7 & 9. Cash Management
- [ ] Cash reconciliation (Arqueo) with Denominations.
- [ ] Report Immutability in `historial_cajas`.
- [ ] Total auditability (Stock vs Sales vs Cash).

## 8. UI/UX Polishing
- [ ] STRICT: Remove BLUE color from system.
- [ ] Auto-formatter for thousands separator in inputs.
- [ ] Clean inputs (no leading zero, empty blank).
