# Project Diane Build Log

## 2026-07-20: Diane Ticket Review deployment verification

Cleaned malformed stray loader fragments that appeared after the closing `</html>` tag in `Index.html`. The cleanup retained one valid `reloadBatches()` implementation with one Airtable branch and one Google Sheets branch, along with the existing handlers and read-only guards.

Created a new deployment after saving and inspecting the source. Live browser verification confirmed that Airtable batches render and the ticket preview works.

The replacement-scan upload still errors because Airtable records have `rowNumber: null` while the existing write path requires a Google Sheets row. No Airtable write behavior was connected in this checkpoint.

## 2026-07-14: Recovering the Document AI bridge and creating the Airtable extractor

This work continued the Diane 2.0 migration from the Google Sheets OCR queue to Airtable. The immediate goal was to replace the missing Scenario 06 Document AI bridge without changing the working Diane review app or the existing stamping service.

### What was recovered

The old `punkrocknerdgirl/diane-tools-api` source repository and local checkout were no longer available, but the deployed Cloud Run artifact was still present. We recovered the image from Artifact Registry:

```text
us-central1-docker.pkg.dev/infra-window-494823-r0/cloud-run-source-deploy/diane-tools-api/diane-tools-api@sha256:eed9bb04727dd23d05d6eb9b71bacabbbd445e2808a8803548467a75b26138b8
```

The image contained only `/app/app.py` and `/app/requirements.txt`. Its entrypoint was `uvicorn app:app --host 0.0.0.0 --port 8080`.

The recovered service was not the lost Document AI bridge. It is the existing PDF/image stamping service:

- `GET /health`
- `POST /stamp/tnb`
- accepts PDF or image uploads
- converts images to PDF with Pillow
- stamps a boxed label onto each PDF page with PyMuPDF
- returns a stamped PDF

That service remains separate and was not modified.

### Existing Document AI capability

The Google Document AI processor still exists and is enabled:

```text
Display name: Diane Ticket Extractor
Type: CUSTOM_EXTRACTION_PROCESSOR
Processor: projects/413667913571/locations/us/processors/61c933f67dba23a3
Version: pretrained-foundation-model-v1.5-pro-2025-06-20
State: DEPLOYED
```

The dedicated service account also exists and has the required Document AI project role:

```text
diane-document-ai-parser@infra-window-494823-r0.iam.gserviceaccount.com
```

### New service created

Because the old bridge source was gone, we created a new separate Cloud Run service rather than changing the working `diane-tools-api` or the Diane review-app Apps Script:

```text
Service: diane-ticket-extractor
URL: https://diane-ticket-extractor-413667913571.us-central1.run.app
Revision: diane-ticket-extractor-00002-vzn
Region: us-central1
Processor: Diane Ticket Extractor custom extraction processor
```

The initial image was built with Cloud Build and deployed privately. A second authenticated image was then built and deployed with the application-level API-key check. Cloud Run's invoker check was disabled so Make can reach the service; the extraction endpoint still requires the application header described below. No API key is stored in this repository.

Build/deploy shape used during recovery:

```bash
gcloud builds submit . \
  --tag us-central1-docker.pkg.dev/infra-window-494823-r0/cloud-run-source-deploy/diane-ticket-extractor/diane-ticket-extractor:20260714-auth \
  --timeout=1200s

gcloud run deploy diane-ticket-extractor \
  --image us-central1-docker.pkg.dev/infra-window-494823-r0/cloud-run-source-deploy/diane-ticket-extractor/diane-ticket-extractor:20260714-auth \
  --region us-central1 \
  --service-account diane-document-ai-parser@infra-window-494823-r0.iam.gserviceaccount.com \
  --memory 1Gi \
  --timeout 300s \
  --allow-unauthenticated
```

The real deployment also supplied the processor environment variables and the API key through Cloud Run configuration. Those values are intentionally omitted here.

### Recovered architecture decision

The Airtable migration changes the queue and storage layer, not the Document AI processor:

```text
Airtable Tickets
  -> Make Scenario 05 OCR
  -> Airtable OCR Outputs / OCR Runs
  -> Scenario 06 selects Tickets with OCR Outputs and no Parser Outputs
  -> Google Drive source file
  -> diane-ticket-extractor /extract/ticket
  -> Make writes Airtable Parser Outputs
  -> validation/review layer
```

The old Sheets fields `Submission ID` and `Cleaned File ID` are not recreated. The current v2 correlation is the Airtable Ticket record / Ticket Key, and the file input is `Tickets.Source File ID`. Parser Outputs should link back to the Ticket and OCR Output records.

### Code-level retrieval notes

The recovered `diane-tools-api` container can be inspected again without the missing GitHub checkout:

```bash
docker pull us-central1-docker.pkg.dev/infra-window-494823-r0/cloud-run-source-deploy/diane-tools-api/diane-tools-api@sha256:eed9bb04727dd23d05d6eb9b71bacabbbd445e2808a8803548467a75b26138b8
docker run --rm --entrypoint sh <image> -lc 'find /app -maxdepth 3 -type f -print | sort'
```

The recovered `app.py` architecture is intentionally summarized here rather than copied into the public repo. It defines a FastAPI app, `/health`, image-to-PDF normalization, PDF stamping, and `/stamp/tnb`. It does not call Document AI, download Drive files, or parse ticket entities.

The new extractor's source was created in Cloud Shell as `~/diane-ticket-extractor` with `app.py`, `requirements.txt`, and `Dockerfile`. Its code-level contract is:

- `GET /health` returns service and processor identity.
- `POST /extract/ticket` accepts multipart `file` and optional `submission_id`.
- Accepted MIME types are PDF, JPEG, PNG, TIFF, and WebP.
- The service sends the raw bytes and MIME type to Document AI's `ProcessRequest`.
- Entity values are returned dynamically under `data.fields`.
- Per-field confidence values are returned under `data.confidence`.
- A flat audit-friendly entity list is returned under `data.entities`.
- The endpoint requires `X-Diane-API-Key`; the key is stored only in Cloud Run configuration.

### Verification and remaining work

Completed:

- recovered and inspected the old Cloud Run artifact
- proved it was the TNB stamping service, not the Document AI bridge
- confirmed the Document AI processor is enabled and deployed
- confirmed the dedicated parser service account
- built and deployed `diane-ticket-extractor`
- verified the private health endpoint before opening Make access

Remaining:

1. Verify the public `/health` response after the invoker-check update.
2. Test `/extract/ticket` with one known Diane source file and inspect the actual entity names and confidence values.
3. Update Scenario 06 module [5] to send the downloaded file to `/extract/ticket` with the API-key header and `submission_id`/Ticket Key.
4. Replace the old parser-output mappings with Airtable Parser Outputs links and the observed Document AI entity names.
5. Run one end-to-end ticket through OCR, extraction, Parser Outputs, and review before increasing the batch limit.

## 2026-06-28: Scenario 10 Invoice Builder

Tonight was supposed to be a quick check of the Statewide Materials invoice flow. Instead, it became a repair-and-build session, which is usually how automation tells you where the real work lives.

We confirmed the weekly Statewide batch had **28 billable tickets** in `TICKETS_CLEAN`, split by driver:

- **DC:** 16 tickets
- **DS:** 12 tickets

The key rule stayed intact: **ticket dates belong to the tickets, not the invoice window.** The invoice period can cover the billing week, but every ticket keeps its real source date.

Scenario 10 already existed, but it was still a test skeleton. It searched old Statewide rows, set hardcoded invoice values, cleared a test invoice sheet, and stopped. It did not actually stage or generate invoice lines.

We finished the missing middle:

- created a new `INVOICE_LINES` staging tab in Diane 1.1
- updated Scenario 10 to stage weekly Statewide invoice lines there
- added a safety filter for `Status = Ready for Billing` and `Ready for Billing = Yes`
- ran Scenario 10 cleanly with all 28 expected rows
- split the final invoices by driver
- created separate invoice files outside Diane
- cleaned up the invoice formatting to match the existing Statewide layout

Final outputs:

- **Statewide Materials Invoice - DC - 2026-06-22 to 2026-06-28**
- **Statewide Materials Invoice - DS - 2026-06-22 to 2026-06-28**

Both invoices were reviewed, cleaned up, and sent to the broker.

The important design decision: **Diane stays the engine room. Final invoices should be separate files.** That keeps the automation workbook clean while still producing broker-ready documents that can be attached to QBO invoices and emailed for payment.

Next step: turn the final invoice builder into a repeatable flow that reads from `INVOICE_LINES`, splits by broker/driver, creates standalone invoice files, exports PDFs, and queues the broker delivery packet.

## 2026-07-23: Manual Airtable driver-pay save path

Verified source and deployment work for the narrow manual driver-pay workflow:

- Apps Script Version 64 deployed successfully.
- `Index.html` now passes the active Airtable Validation Queue record ID with Save Ticket and routes Airtable saves to the Airtable handler while preserving the Sheets save path.
- `Code.gs` now updates the existing Validation Queue record by Airtable record ID, writing the confirmed ticket date, ticket number, driver, quantity, rate, and line total fields.
- `AirtableReadAdapter.gs` was restored after the editor surfaced it as syntactically corrupted; no adapter logic was changed.

Live save-and-refresh persistence was not verified because the browser session would not navigate to the new deployment URL. No claim is made about persisted live values until that test is completed.

## 2026-07-23: Airtable write-permission diagnosis

Version 64 loaded the Airtable batch and ticket successfully, but Save as Draft returned Airtable HTTP 403 `INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND`.

Verified from the deployed project source and Script Properties:

- Base ID: `appMWvtLU0hMBqjLC` (Diane 2.0)
- Validation Queue table ID: `tblbiwkOS9LDi5yaV`
- Write endpoint: `https://api.airtable.com/v0/appMWvtLU0hMBqjLC/tblbiwkOS9LDi5yaV/{record ID}`
- Write helper and read adapter both use Script Property `AIRTABLE_TOKEN` and the same base/API configuration.

The endpoint and record-target architecture are correct. The configured token is accepted for reads but is not authorized to PATCH the Diane 2.0 Validation Queue model. No source change or deployment was made; the remaining fix is to replace or update `AIRTABLE_TOKEN` with a token that has record-write access to this base.

## 2026-07-23: Airtable numeric save verification

Version 65 deployed a focused fix in `saveAirtableTicketFields()` so `Final Quantity`, `Final Rate`, and `Final Total` are sent as numeric JSON values. Blank numeric fields remain omitted, and invalid numeric text raises an error instead of becoming zero.

Live verification completed on ticket `402574` in the Airtable Validation Queue:

- Save as Draft succeeded.
- The app was refreshed.
- The same ticket was reopened.
- Quantity persisted as `24.06`.

## 2026-07-23: Read-only OCR Hints

Version 70 added a read-only OCR Hints panel to the ticket review form. `AirtableReadAdapter.gs` now loads linked Parser Outputs and OCR Outputs, exposes raw OCR text and extracted values, and provides display-only candidates with Validation Queue Final → Parser Output → OCR precedence. A display-only date parser also recognizes readable dates in Raw OCR Text when the extracted date field is blank.

Verified after refresh in Version 70:

- Ticket `403598`: OCR date hint `07/14/2026`
- Ticket `1980051253`: OCR date hint `07/15/2026`
- Ticket `811010648`: OCR date hint `07/17/2026`
- Ticket `0825277`: OCR date hint `07/18/2026`

No OCR values were written to Airtable, and save/approve, replacement scan, Sheets behavior, and downstream processing were not changed.
