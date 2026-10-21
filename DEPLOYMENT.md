# Render deployment

Deploy the frontend and API together as one Docker web service in Singapore.
`render.yaml` declares a Starter instance and 1 GB persistent disk. These are
paid resources; review Render's current price before creating the service.
Automatic deploys are off so future repository changes do not publish silently.

## Publish

1. Push this application version, including `Dockerfile`, `render.yaml`,
   `server/` and `deployment-data/`, to the GitHub repository.
2. In Render choose **New → Blueprint**, connect the repository and choose the
   branch containing these deployment files. Review the proposed resources/cost.
3. Create the Blueprint. The Docker build compiles React; Python serves both
   the built frontend and `/api` under the generated HTTPS URL.
4. Wait for the deployment to become live. `/api/health` must return HTTP 200.
5. Open the HTTPS URL. Username is `solarsync`; retrieve the generated
   `SOLARSYNC_ACCESS_PASSWORD` from Render's service environment settings.
   Do not put this password in the repository or a shared URL.

## Storage and access

SQLite and imported source archives live under `/var/data`, the persistent disk
mount. One application process is intentional for this SQLite deployment.
Do not remove the disk or switch to ephemeral storage if saved records matter.
The password protects the whole app, API and API documentation. Health exposes
only service connectivity. Shared-password users access the same site records;
this is a small-team deployment, not a multi-tenant account system.

The image includes **only verified public NASA and data.gov.my snapshots** from
`deployment-data/manifest.json`. Bootstrap validates SHA-256, runs the existing
import validation, and imports only into empty dataset tables. Restarts and
redeploys preserve existing data. Local databases, local raw data directories,
meter files, site records and scenario histories are excluded from the image.
OSM building data is fetched/cached on demand by the hosted application.

Refresh public sources deliberately from the Render Shell:

```sh
python server/pipeline.py --source all --year 2025
```

## Local production check

With Docker Desktop's Linux engine running:

```sh
docker build -t solarsync .
docker volume create solarsync-data
docker run --rm -p 10000:10000 -v solarsync-data:/var/data -e SOLARSYNC_ACCESS_PASSWORD solarsync
```

Set `SOLARSYNC_ACCESS_PASSWORD` in your shell first. Use `solarsync` as the
username. The service honors Render's `PORT` environment variable.

Relevant official references: [Blueprints](https://render.com/docs/blueprint-spec),
[Docker](https://render.com/docs/docker), [persistent disks](https://render.com/docs/disks),
[health checks](https://render.com/docs/health-checks).
