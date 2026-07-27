# Diane 2.0 Ticket Detail Layout and Refresh Restoration Live Verification

**Date:** 2026-07-26

## Checkpoint purpose

This checkpoint records the successful Version 96 deployment and controlled live verification of the Diane ticket-detail layout, refresh restoration, shared-field copy, and remove-from-batch behavior.

## Repository state before deployment

- Repository: `https://github.com/punkrocknerdgirl/diane`
- Branch: `main`
- Local repository was fast-forwarded cleanly to documentation checkpoint commit:
  - `f38aa081312eab5693797dd2608cee42a9f56248`
  - `Add ticket detail predeployment checkpoint`
- Working tree was clean and matched `origin/main`
- Apps Script source remained from application-source commit:
  - `b0b6a69c5a2a5c0e31e0486c2ab2bfae326fb1f3`
  - `Fix ticket detail layout and restore refresh state`
- No Apps Script source was modified during deployment verification.
- No Airtable or Make configuration changes occurred.

## Apps Script deployment

- Apps Script project ID: `1kX8RuUiYcKmXExMDg4zhOm-E-rDHMw08JPqegWiBB36sUN0XZSnsJbAZ`
- Existing live deployment ID: `AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc`
- Previous live deployment version: **95**
- New version created: **96**
- Version description: `Fix ticket detail layout and restore refresh state`
- Existing live deployment updated to Version 96
- Deployment ID remained unchanged
- No second deployment was created

Verified deployment result:

```text
Deployed AKfycbzzjkCqwsiCO7vahT1BJn6S4fArwA5dTtsoVEmEz9c05i8P9RTprUOtZ0OKvp2prfc @96
```

## Live `/exec` verification

The live Diane review page was tested after deployment.

Verified:

- ticket-detail layout changes are live
- field changes appear to save correctly
- refreshing while a ticket detail is open keeps the same ticket open
- the restore behavior works on the live `/exec` deployment
- the existing deployment remains functional on Version 96

## Shared-field copy controlled test

The controlled shared-field workflow was tested using Customer / Job.

Verified behavior:

1. Customer / Job could be changed and saved.
2. Apply Shared Fields to All Tickets copied the value successfully.
3. The copied value remained independently editable.
4. Customer / Job could be changed again and applied again.

Result:

- shared-field copy is working
- copied values remain editable afterward
- the controlled test passed

## Remove-from-batch controlled test

A ticket was removed from the controlled batch.

Verified behavior:

- the remove action completed
- returning to the overview showed that the tickets were no longer batched
- the removed ticket retained its entered values and Reviewer Notes when checked afterward

Result:

- remove-from-batch is working
- preserved ticket data remained intact in the observed test
- the controlled test passed

## Deferred cleanup

The following items were observed but are not blockers for the current deployment:

- the date field is an actual date field but is not currently displayed as `YYYY-MM-DD`
- some ticket-detail alignment needs refinement
- Remove Ticket from Batch does not provide visible confirmation feedback on the page

These items are deferred. No date-format or alignment changes were attempted during this deployment session.

## Current verified state

- Live Diane deployment: Version **96**
- Existing deployment ID: unchanged
- Ticket-detail refresh restoration: passed
- Shared-field copy controlled test: passed
- Remove-from-batch controlled test: passed
- No Apps Script source changes after deployment
- No Airtable changes beyond the intentional controlled live test actions
- No Make changes

## Recommended next step

Before further source work, fast-forward the local repository to include this documentation-only checkpoint if GitHub is ahead.

Future cleanup may address:

- `YYYY-MM-DD` date display
- ticket-detail alignment
- visible remove-from-batch confirmation
