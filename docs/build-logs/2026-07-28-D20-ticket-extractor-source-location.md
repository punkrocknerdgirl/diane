# Diane 2.0 Ticket Extractor Source Location

**Date:** 2026-07-28

## Purpose

Document the verified infrastructure and source-package location for the Cloud Run service used by the Make scenario **D - Document AI Extractor**.

This information was not clearly recorded in the existing Diane build documentation, which caused unnecessary searching across Make, GitHub, Cloud Run, Artifact Registry, Cloud Build, and Cloud Storage.

## Make integration

Make scenario:

`D - Document AI Extractor`

HTTP module:

`Send File to Document AI Bridge`

Method:

`POST`

Endpoint:

`https://diane-ticket-extractor-413667913571.us-central1.run.app/extract/ticket`

Authentication header:

`X-Diane-API-Key`

Do not record the API key value in GitHub.

## Google Cloud Run service

Google Cloud project:

`Project Diane`

Google Cloud project ID:

`infra-window-494823-r0`

Service:

`diane-ticket-extractor`

Region:

`us-central1`

Active revision verified on 2026-07-28:

`diane-ticket-extractor-00003-psb`

The active revision receives 100% of service traffic.

The service was deployed from a container image. Cloud Run does not have editable source attached to the service.

## Artifact Registry image

Artifact Registry repository:

`cloud-run-source-deploy`

Image/package:

`diane-ticket-extractor/diane-ticket-extractor`

Verified image tag:

`20260714-auth`

The image was built on 2026-07-14.

The Artifact Registry image page links to Cloud Build:

`aba55635-8f9e-44e4-9078-15b83a6a54c8`

## Cloud Build source package

Cloud Build used a source archive stored in Google Cloud Storage.

Verified source object:

`gs://infra-window-494823-r0_cloudbuild/source/1784054120.073818-ff3f2e2920054b1d93178d6d080e650d.tgz`

The source archive is private and requires authenticated access to the Project Diane Google Cloud project.

Verified object details:

- type: `application/x-tar`
- size: approximately 6.2 KB
- created: 2026-07-14 at approximately 1:35 PM
- public access: disabled

A copy downloaded during inspection was named:

`source_1784054120.073818-ff3f2e2920054b1d93178d6d080e650d.tar`

## How to find the source again

1. Open Google Cloud Console.
2. Select **Project Diane**.
3. Open **Cloud Run**.
4. Open service **diane-ticket-extractor**.
5. Open **Revisions**.
6. Select the active revision.
7. Click the container **Image** link.
8. On the Artifact Registry image page, click the linked **Build**.
9. On the Cloud Build page, open the **Source** object.
10. Download the private `.tgz` source archive from Cloud Storage.

The direct Cloud Storage URI above should be used whenever possible instead of repeating the full click path.

## Repository search result

The service source was not found through repository searches in:

- `punkrocknerdgirl/diane`
- `punkrocknerdgirl/diane-apps-script`

The deployed source package is currently preserved through Google Cloud Storage and Cloud Build rather than a verified GitHub source location.

## Documentation follow-up

Before changing or redeploying the extractor:

- preserve the existing source archive
- identify the complete source contents
- place the maintained source in an appropriate GitHub repository
- document the build and deployment procedure
- never commit API keys, credentials, or secret environment-variable values

## Changes made during this inspection

- No Cloud Run revision was created.
- No container image was changed.
- No Cloud Build was retried.
- No Make scenario was changed.
- No Make schedule was enabled.
- No Airtable records or schema were changed.
- No extractor source was edited or deployed.
