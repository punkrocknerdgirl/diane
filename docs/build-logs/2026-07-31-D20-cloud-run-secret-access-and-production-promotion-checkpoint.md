# Diane 2.0 Cloud Run Secret Access and Production Promotion Checkpoint

**Date:** 2026-07-31
**Project:** Diane 2.0
**Google Cloud project:** `infra-window-494823-r0` / Project Diane
**Cloud Run service:** `diane-ticket-extractor`
**Region:** `us-central1`

## Objective

Recover the new Cloud Run revision after it failed to read the Airtable token from Secret Manager, test the replacement revision without touching production traffic, and promote it only after a successful health check.

## Starting state

- Production revision: `diane-ticket-extractor-00003-psb`
- Production traffic: 100%
- New revision: `diane-ticket-extractor-00004-mzw`
- New revision traffic: 0%
- Artifact image tag: `20260714-auth`
- Artifact digest: `sha256:b24d413d0aabca56827601ca3e77ae77153e1f084d669fb963136debd2b67b73`

## Failure diagnosis

Revision `00004-mzw` could not become ready because its runtime service account lacked permission to read Secret Manager secret `diane-airtable-token`.

Service account:

`diane-document-ai-parser@infra-window-494823-r0.iam.gserviceaccount.com`

Required role:

`roles/secretmanager.secretAccessor`

Secret:

`projects/413667913571/secrets/diane-airtable-token`

## Fix applied

Granted the service account **Secret Manager Secret Accessor** on the individual secret `diane-airtable-token`.

The permission was verified in Secret Manager under the secret's **Permissions** tab.

No project-wide IAM grant was used.

## Replacement revision

A fresh Cloud Run revision was deployed with the existing container image and configuration after the secret permission was corrected.

Replacement revision:

`diane-ticket-extractor-00005-zs`

Initial traffic:

0%

The revision became Ready successfully.

## Isolated test

Added revision tag:

`candidate`

Candidate URL:

`https://candidate---diane-ticket-extractor-baxx73vdnq-uc.a.run.app`

Root response confirmed service endpoints:

- `GET /health`
- `POST /extract/ticket`

Health endpoint test:

`GET /health`

Returned:

```json
{"ok":true,"service":"diane-ticket-extractor","processor":"projects/413667913571/locations/us/processors/61c933f67dba23a3"}
```

This confirmed the candidate revision was running and could access its configured Document AI processor.

## Production promotion

Traffic was moved only after the candidate health check passed.

Final traffic state:

- `diane-ticket-extractor-00005-zs` = 100%
- `diane-ticket-extractor-00004-mzw` = 0%
- `diane-ticket-extractor-00003-psb` = 0%
- Older revisions = 0%

Cloud Run reported both service update and traffic routing as Completed.

## Current production state

Production now runs on:

`diane-ticket-extractor-00005-zs`

The previous production revision remains available for rollback.

## Guardrails preserved

- No traffic was sent to an untested revision.
- No live URL was changed.
- No secret was exposed or rotated.
- No broad project-level Secret Manager grant was added.
- Old revisions were retained for rollback.
- The failed revision was not promoted.

## Next recommended verification

Run one controlled end-to-end ticket extraction through the normal Diane workflow and confirm:

1. Cloud Run receives the request.
2. Document AI extraction succeeds.
3. Airtable writes succeed using `diane-airtable-token`.
4. No new errors appear in Cloud Run logs.

Do not delete previous revisions until the end-to-end workflow is confirmed stable.
