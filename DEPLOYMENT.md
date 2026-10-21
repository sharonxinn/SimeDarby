# Free Render deployment

The frontend and Python API deploy together as one Docker web service in Singapore.
`render.yaml` selects **plan: free**, with **no paid disk or database**. Automatic
redeploys are off. Review the Render workspace usage/spending settings: bandwidth
and build quotas still apply; this configuration does not provision paid resources.

[Deploy this branch to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fsharonxinn%2FSimeDarby%2Ftree%2Fcodex%2Frender-deployment)

## Publish

1. Open the deployment link while signed in to Render. For a private repository,
   grant Render access to the repository when prompted.
2. Review the Blueprint: one **Free** web service, no disk and no paid database.
3. Create the Blueprint and wait for the Docker build and health check to pass.
4. Open the generated HTTPS URL. No username or password is required.
   The Blueprint sets `SOLARSYNC_PUBLIC_ACCESS=true` and uses separate browser
   sessions for saved records. This setting overrides any password left over
   from an earlier version.

For an already-created service, select **Manual Deploy → Deploy latest commit**
after setting `SOLARSYNC_PUBLIC_ACCESS=true` and
`SOLARSYNC_VISITOR_DIR=/tmp/solarsync/visitors` in Render's Environment settings,
or sync the updated Blueprint. Do not enable public access on an older application
version: the new visitor-isolation code must be included in the redeploy.

## Free-tier limits and storage

Render sleeps free services after 15 minutes without requests. A new visit wakes
it, with a cold-start delay. Local files, including the SQLite database, are lost
on sleep, restart and redeploy. Free services cannot attach persistent disks.
The app displays this limit and Plan offers **Export records** to save a JSON copy.
Records can be re-entered from that copy; there is no automatic JSON restore yet.
Each browser gets a separate temporary database, identified by an HTTP-only
session cookie. Other browsers cannot list its records by default. Clearing the
cookie or changing browsers loses access to that workspace. Export important
records; there is no account recovery or cross-device login in this preview.
Existing shared-password records are not copied into any public visitor session.

The database and raw imports use `/tmp/solarsync`. A fresh server loads checksum-
verified public NASA and data.gov.my snapshots from `deployment-data/manifest.json`.
No local meter data, site records, scenario histories, local database or secrets
are uploaded. OSM geometry is fetched and cached on demand. The image has all
public solar inputs needed for a forecast without an initial NASA download.
Free services do not provide Render Shell access; update bundled public data in
the repository deliberately and redeploy when a new complete resource year is needed.

For durable records later, provision a supported persistent external database or
move to a paid service with a disk; this requires a separate storage configuration.

## Local production check

With Docker Desktop's Linux engine running:

```sh
docker build -t solarsync .
docker run --rm -p 10000:10000 -e SOLARSYNC_PUBLIC_ACCESS=true -e SOLARSYNC_VISITOR_DIR=/tmp/solarsync/visitors -e SOLARSYNC_DB_PATH=/tmp/solarsync/app.db -e SOLARSYNC_DATA_DIR=/tmp/solarsync/raw -e SOLARSYNC_STORAGE_MODE=ephemeral solarsync
```

The service honors Render's `PORT` environment variable. Relevant official docs:
[free-tier limits](https://render.com/docs/free),
[Blueprints](https://render.com/docs/blueprint-spec),
[Docker](https://render.com/docs/docker).
