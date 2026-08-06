# TODO / Working Backlog

> Status of the current development cycle. Completed phases are tracked in the [CHANGELOG.md](./CHANGELOG.md).

## Current cycle

### Sales module phase-2 (Delivery Challans — transport & e-way bill)

- [x] DB migration `0006_dc_phase2_transport_eway` (vehicle type, e-way bill, transport details, totals, addresses)
- [x] Backend: Delivery Challan transport fields, partial/full dispatch validation
- [x] Backend: auto numbering (`DC-####`), `next-number` preview endpoint
- [x] Backend: Quotation → Order → Challan → Invoice conversion service
- [x] Backend: Quotation revisions, finalize, submit-for-approval, send-to-customer endpoints
- [x] Frontend: quotation form, sales order form, delivery challan form, conversion modal
- [x] Unit tests for conversion + challan + reports services (25 passing)
- [ ] Frontend wiring QA — routes/sidebar review for the new sales screens
- [ ] E2E test coverage for the conversion flow

## Repository / DX

- [x] Move dev documents (reports/, planning/, prompts/) into `archive/`
- [x] Remove dev databases from version control
- [x] Complete `.env.example`
- [x] Contribution, security & conduct docs
- [x] GitHub issue/PR templates
- [ ] Wire GitHub Actions labels (`.github/labels.yml`)
- [ ] Add Dependabot config for automated dependency updates
- [ ] Publish initial release + tag `v1.0.0`

## Known limitations (see also DEPLOYMENT.md → Troubleshooting)

- `backend/test/auth.e2e.spec.ts` requires a live database — not runnable in CI without a DB service.
- ESLint reports I/O errors on Windows (CI runs on Ubuntu where it passes).
- S3/MinIO storage adapters require additional npm packages to be installed.
- Email/SMS/Push notification providers require third-party credentials to activate.
