# Diane 2.0 Review-First Batching Checkpoint

**Date:** 2026-08-01 6:45 PM Central
**Repository:** `punkrocknerdgirl/diane`

## Verified current state

- Scenario A completed with Import Run `MOTIVE_LIVE_FRESH_20260701_20260801` and 83 linked Tickets.
- Scenario B completed for all 83 Tickets with cleaned file fields populated and no cleaning errors.
- Scenario C completed with 83 complete OCR Runs and 83 linked OCR Outputs with Raw OCR Text populated.
- Scenario D completed with 83 Parser Outputs and 83 Validation Queue records. All Parser Outputs are `Needs Review`; all Validation Queue records are `Pending Review`.
- No duplicate Parser Outputs or Validation Queue records were found during verification.

## Scenario E finding

The live Scenario E run exposed a dispatch-candidate fan-out:

- Dispatch Search module 18 ran at the validation-record level.
- Set Multiple Variables module 20 executed 498 times.
- Array Aggregator module 23 rebuilt candidate arrays.
- Make Code module 24 compared OCR text with Dispatch customer, job, destination, and origin values, resolved candidates, and generated `DISPATCH_<dispatchId>` Review Batch keys.

The 498 executions came from candidate bundles reaching module 20, not from the number of variables mapped inside that module.

The final Airtable state produced by Scenario E has not yet been fully re-verified. Do not assume all 83 Validation Queue records were correctly batched until checked.

## Current product goal

For Diane at this stage:

- Imperfect, partial, sparse, uncertain, and low-confidence data is acceptable in review.
- Diane must not wait for perfect data before moving forward.
- A Ticket without a Dispatch match must continue.
- A Dispatch without a Ticket is valid.
- No match means unassigned, not failed.
- Review is where missing and uncertain values are corrected.
- Manual batching is a normal path.
- Automatic Dispatch matching may be added later from human correction patterns, but it must not gate review admission.

## Architectural direction

Use a review-first flow:

```text
Ticket -> OCR -> extraction -> Validation Queue -> review regardless of completeness -> manual or automatic batching -> optional Dispatch assignment
```

Do not require this flow:

```text
Ticket -> resolved Dispatch -> Review Batch -> review
```

## What was not changed

- No Make module, mapping, filter, or route was changed.
- No Make scenario was saved or activated.
- No Airtable schema or record was changed during this analysis.
- No Apps Script source, version, or deployment was changed.
- No application source was changed.

## Working method approved by the user

- The user will duplicate Scenario E before any modification.
- Do not require a broad module-by-module mapping audit.
- Pinpoint the smallest necessary change.
- Give one exact click or action at a time.
- Wait for the result before giving the next action.
- Do not direct deletion until the duplicate exists and the replacement path is proven.

## Guardrails

- Stay in chat and work one step at a time.
- Use only the live `Diane 2.0` Airtable base, base ID `appMWvtLU0hMBqjLC`, for verification.
- Do not touch archive or test bases.
- Do not delete or recreate the 83 Tickets.
- Do not rerun Scenario A.
- Do not reset or improperly reuse the completed Import Run.
- Do not modify Airtable schema without explicit approval.
- Work on a duplicate of Scenario E, not the original.
- Do not claim a test, save, write, commit, or deployment unless verified.

## Smallest correct next step

Create and clearly rename a duplicate of Scenario E in Make. Do not change any module yet.

After the duplicate exists, identify the bundle immediately before the Dispatch search that already contains the Validation Queue record ID and available parser or ticket data. Build a direct review-admission path in the duplicate so every Validation Queue record can continue without a Dispatch-derived Review Batch key. Provide instructions one exact action at a time.