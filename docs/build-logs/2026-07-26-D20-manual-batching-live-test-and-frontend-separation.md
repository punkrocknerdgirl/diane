# 2026-07-26: Diane 2.0 Manual Batching Live-Test Preparation and Front-End Separation

## Status

**MANUAL BATCHING DEPLOYED FOR CONTROLLED TEST — LIVE AIRTABLE MUTATION NOT YET RUN — FRONT-END FILE SEPARATION IN PROGRESS**

## Starting source state

Private Apps Script source repository:

```text
punkrocknerdgirl/diane-apps-script
```

Local checkout:

```text
/Users/erniehathaway/Documents/PRNG/Work/diane-apps-script
```

Starting commit:

```text
b9e43a5a206300f00c87093859b55be5c3d2ffff
Align overview rows and style ticket number
```

Approved uncommitted changes were present in:

```text
AirtableReadAdapter.gs
Code.gs
Index.html
```

The working tree was intentionally not reset, discarded, or recreated.

## Manual Airtable batching implementation

The current local and Apps Script source includes the Airtable-native manual-batching path documented on 2026-07-25.

Key behavior remains:

- ticket selection by Airtable Validation Queue record ID
- one `MANUAL_` Review Batch created from selected eligible records
- Review Batch Status = `Draft`
- Validation Queue Batch Assignment Source = `Manual`
- Validation Queue Batch Lock = checked
- Validation Queue → Review Batches is the authoritative relationship write
- reciprocal links are re-read and verified
- duplicate-request protection uses CacheService and LockService
- partial failures report created batch, successful links, failed links, and current state
- no automatic rollback
- no Ticket, OCR, Parser, Make, or Google Sheets mutation
- Airtable bulk approval remains disabled

No controlled live Airtable manual-batching write has been run yet.

## Controlled test candidates

Two eligible unbatched Validation Queue records were selected for the controlled live test:

```text
rec0uwH3KaCPOqmHG
VAL_INTAKE_MOTIVE_1024750548_1024750552
Linked Ticket: recCVauUgZfHOU2jX
Ticket Number: 1052089985
```

```text
rec2NSd63jLIECVZa
VAL_INTAKE_MOTIVE_1034043804_1034043807
Linked Ticket: recjjGouH4B8Z2UoT
Ticket Number: 0825536
```

Both were independently verified as:

- Review Status = `Pending Review`
- Processed to Tickets = unchecked
- Do Not Bill = unchecked
- Review Batches = empty
- not one of the two existing Dispatch-linked test records

The live test must still stop before execution for an explicit final approval checkpoint.

## Overview ticket-row cleanup

The overview already allowed ticket drill-down by clicking anywhere on the ticket row. The separate `View Ticket` button was therefore removed as redundant.

Implemented:

- removed the `View Ticket` button from overview rows
- removed the `Action` table heading
- retained Ticket # as the final far-right column
- retained right alignment
- preserved row-click behavior
- preserved checkbox `stopPropagation()` behavior
- made no backend or batching changes

Focused JavaScript syntax checks and `git diff --check` passed.

## Apps Script deployment

The approved local source was pushed to the existing Apps Script project.

A Google reauthentication interruption occurred on the first `clasp push` attempt:

```text
invalid_grant
invalid_rapt
```

After reauthentication, the push completed successfully.

Apps Script Version 80 was created:

```text
Add manual Airtable batching and simplify overview ticket actions
```

Existing deployment updated in place:

```text
AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc
```

Current deployed version:

```text
80
```

Creating and deploying Version 80 did not itself mutate Airtable.

## Front-end file separation decision

A standing project rule was established for Diane and future PRNG web apps:

- HTML structure should remain in `Index.html`
- CSS should live in a dedicated front-end include file
- client-side JavaScript should live in a separate include file when practical
- server-side Apps Script remains in `.gs` files
- separation should not be forced when it would make the implementation less reliable or harder to maintain

For Apps Script, the target structure is:

```text
Index.html
Stylesheet.html
JavaScript.html
Code.gs
AirtableReadAdapter.gs
appsscript.json
```

The intended Apps Script include pattern is:

```html
<?!= include('Stylesheet'); ?>
```

and:

```html
<?!= include('JavaScript'); ?>
```

with an include helper in `Code.gs` and `Index.html` served through `createTemplateFromFile('Index').evaluate()`.

This is an organization refactor only. The CSS and client-side JavaScript must be moved unchanged before any styling edits are made.

## Historical note: CSS emancipation

On 2026-07-26, Diane's CSS was formally granted freedom from the fiefdom of the monolithic HTML page.

The practical reason is equally important: visual tuning, border changes, color-theme experiments, and detailed design review should be possible from one searchable stylesheet without excavating markup and application logic. This also establishes a repeatable front-end organization standard for future PRNG builds.

## Ticket-number styling request

A follow-up visual request remains pending after file separation:

- give the overview Ticket # badge the same background treatment as the Draft badge/button
- remove its border
- use white text
- retain its current size, padding, weight, and right alignment

This styling change should be made in `Stylesheet.html` after the separation refactor is verified.

## Confirmed unchanged systems

- no controlled live Airtable manual-batching write yet
- no Ticket fields updated
- no OCR Outputs updated
- no Parser Outputs updated
- no Review Status changes
- no ticket approvals
- no Apply Batch Fields action
- no Make changes
- no Google Sheets changes
- no Airtable schema changes
- no broader production scope enabled
- no Git commit or push in `diane-apps-script`

## Next steps

1. Finish and verify the pure front-end file separation.
2. Confirm no visual or behavioral change.
3. Apply the Ticket # badge styling in `Stylesheet.html` as a separate focused change.
4. Push, version, and deploy only after review and approval.
5. Re-open the deployed review page and verify the UI.
6. Run the controlled manual-batching test with exactly the two approved Validation Queue records.
7. Independently verify Airtable before expanding scope.
