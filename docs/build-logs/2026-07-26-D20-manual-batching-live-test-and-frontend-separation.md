# 2026-07-26: Diane 2.0 Manual Batching Live-Test Preparation and Front-End Separation

## Status

**FRONT-END SEPARATION COMPLETE — VERSION 82 LIVE — CONTROLLED MANUAL-BATCHING TEST READY — LIVE AIRTABLE MUTATION NOT YET RUN**

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

Use exactly these two eligible unbatched Validation Queue records for the controlled live test:

```text
Validation Queue Record ID: rec0uwH3KaCPOqmHG
Validation ID: VAL_INTAKE_MOTIVE_1024750548_1024750552
Linked Ticket Record ID: recCVauUgZfHOU2jX
Ticket Number: 1052089985
Truck: WRIGHT
Material: 1/2" X 0 KILN FEED
Quantity: 25.43
```

```text
Validation Queue Record ID: rec2NSd63jLIECVZa
Validation ID: VAL_INTAKE_MOTIVE_1034043804_1034043807
Linked Ticket Record ID: recjjGouH4B8Z2UoT
Ticket Number: 0825536
Truck: 2886
Material: 11/2"SUPER BASE TEST
Quantity: 21.65
```

Both were independently verified as:

- Review Status = `Pending Review`
- Processed to Tickets = unchecked
- Do Not Bill = unchecked
- Review Batches = empty
- Assignment Source empty
- Batch Lock unchecked
- not one of the two existing Dispatch-linked test records

The live test must stop before execution for an explicit final approval checkpoint.

## Expected controlled-test result

The test should create exactly one new Review Batch with:

- Batch Key beginning with `MANUAL_`
- Batch Status = `Draft`
- Apply Batch Fields = unchecked
- reciprocal links to exactly the two selected Validation Queue records

Each selected Validation Queue record should receive:

- Review Batches = the new Review Batch
- Batch Assignment Source = `Manual`
- Batch Lock = checked

The test must not change:

- Tickets
- Parser Outputs
- OCR Outputs
- Review Status
- Processed to Tickets
- Do Not Bill
- ticket approval state
- Apply Batch Fields
- Make
- Google Sheets

After the write, independently verify Airtable before expanding scope.

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

## Front-end file separation

Diane's front end is now separated into structure, style, and client-side behavior:

```text
Index.html
Stylesheet.html
JavaScript.html
Code.gs
AirtableReadAdapter.gs
appsscript.json
```

Implemented:

- moved the existing CSS block unchanged from `Index.html` to `Stylesheet.html`
- moved the existing client-side JavaScript block unchanged from `Index.html` to `JavaScript.html`
- added `<?!= include('Stylesheet'); ?>` to `Index.html`
- added `<?!= include('JavaScript'); ?>` to `Index.html`
- added an `include()` helper in `Code.gs`
- updated `doGet()` to use `HtmlService.createTemplateFromFile('Index').evaluate()`
- confirmed no embedded `<style>` or `<script>` blocks remain in `Index.html`
- confirmed syntax checks passed
- confirmed `git diff --check` passed

This established the standing PRNG rule:

- HTML structure stays in `Index.html`
- CSS lives in a dedicated stylesheet include
- client-side JavaScript lives in a separate include when practical
- server-side Apps Script remains in `.gs` files
- separation is not forced when it would create an unnatural or less reliable design

## Historical note: CSS emancipation

On 2026-07-26, Diane's CSS was formally granted freedom from the fiefdom of the monolithic HTML page.

The practical reason is equally important: visual tuning, border changes, color-theme experiments, typography changes, and detailed design review can now be handled from one searchable stylesheet without excavating markup and application logic.

Ernie is pleased.

## Ticket-number badge styling

The overview Ticket # badge was updated in `Stylesheet.html`:

- background = `var(--aqua)`
- text = white
- border = none
- existing size, padding, weight, radius, and right alignment retained

The styling matches the Draft color treatment without changing ticket-row behavior.

## Roboto web font

Roboto is now the primary Diane interface font.

`Stylesheet.html` loads:

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
```

The body font stack is:

```css
font-family:'Roboto',Arial,Helvetica,sans-serif;
```

This allows visitors to see Roboto without installing it locally, with standard fallbacks if Google Fonts is unavailable.

## Apps Script deployment history

Existing deployment:

```text
AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc
```

### Version 80

```text
Add manual Airtable batching and simplify overview ticket actions
```

Deployed successfully after Google reauthentication resolved an initial `invalid_grant` / `invalid_rapt` error.

### Version 81

```text
Separate front-end files and restyle ticket number badge
```

Deployed successfully.

### Version 82

```text
Load Roboto web font
```

Current live deployment version:

```text
82
```

Creating and deploying these versions did not itself mutate Airtable.

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

## Deferred repository consolidation

The Apps Script source currently lives in the separate `diane-apps-script` repository while Diane documentation and build logs live in `diane`.

The user wants the Apps Script source moved into the main Diane repository later, likely under an `apps-script/` directory. That consolidation is intentionally deferred until the review-page batching test is complete.

## Next steps

1. Open the live Version 82 review page.
2. Verify the page loads normally, Roboto renders, the aqua Ticket # badge remains correct, row click works, and ticket selection works.
3. Locate exactly Ticket # `1052089985` and Ticket # `0825536`.
4. Confirm both correspond to Validation Queue records `rec0uwH3KaCPOqmHG` and `rec2NSd63jLIECVZa`.
5. Select only those two tickets.
6. Stop and show the selected state before clicking `Create Batch from Selected`.
7. After explicit approval, create exactly one manual batch.
8. Independently verify the new Review Batch and both Validation Queue links in Airtable.
9. Stop on any partial failure and report exact state without automatic rollback.
10. Do not expand to the remaining production scope until the two-record test is proven.
