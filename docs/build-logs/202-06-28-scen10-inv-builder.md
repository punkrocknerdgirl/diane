# Project Diane Internal Docs

Internal source-of-truth documentation for Project Diane lives here.

## Rule

If it is internal, reusable, technical, operational, or pipeline-related, it belongs in Markdown in this repo.

Google Docs is for client-facing deliverables.
ClickUp is for tasks, checklists, priorities, and commitments.
ChatGPT project conversations are working sessions, not durable documentation.
Make.com is execution infrastructure, not documentation.
Google Sheets is live pipeline data, not the canonical explanation of how the system works.

## Triage buckets

When auditing old notes, docs, chats, screenshots, and build artifacts, sort each item into one of these buckets:

1. Source-of-truth internal docs -> move here as Markdown.
2. Client-facing deliverables -> keep in Google Docs.
3. Task tracking -> convert to ClickUp task/checklist.
4. Live data or working tables -> keep in Google Sheets.
5. Automation build details -> document here, then implement in Make.com / Apps Script / connected tools.
6. Old/no longer useful -> archive/dungeon.

## Current docs to create next

* `diane-overview.md`
* `build-log.md`
* `pipeline-map.md`
* `ocr-intake.md`
* `ticket-routing.md`
* `invoice-generation.md`
* `google-sheets-structure.md`
* `make-scenarios.md`
* `apps-script-functions.md`
* `error-handling.md`
* `client-delivery-rules.md`

## Operating doctrine

Every major decision, pipeline spec, naming convention, routing rule, field definition, automation behavior, failure mode, and how-this-works writeup gets extracted from working sessions and committed here.

No important system knowledge should live only in chat.

## Project Diane purpose

Project Diane is the internal automation and documentation system for trucking ticket intake, OCR processing, invoice preparation, batch routing, and related bookkeeping workflows.

The goal is not to make a fragile robot goblin that guesses silently.

The goal is a boring, reliable machine that:

* captures source documents,
* extracts useful data,
* routes tickets correctly,
* supports review before billing,
* preserves audit trails,
* reduces repeat manual work,
* and makes future-Ernie less likely to throw a keyboard into the sun.

## Documentation standards

Markdown files should be:

* plain-language first,
* specific enough to rebuild from,
* current enough to trust,
* organized by function,
* updated when the workflow changes.

Every doc should answer at least one of these questions:

* What is this?
* Why does it exist?
* Where does it live?
* What inputs does it expect?
* What outputs does it create?
* What tools does it touch?
* What can go wrong?
* How do we know it worked?

## Commit rule

If Project Diane changes in a way that affects operations, automation, client delivery, review steps, or troubleshooting, update the relevant Markdown doc before considering the change finished.

Working notes can be messy.
Committed docs should be usable.
