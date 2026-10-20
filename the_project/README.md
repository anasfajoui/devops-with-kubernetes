## The Project

- The form sends new todos (limited to 140 characters) to the Todo Backend service.
- The list of todos is fetched from the Todo Backend service.
- The random image is persistently cached.
- The shutdown buttons exit either the Todo App or Todo Backend process so K8s restarts the selected container. The cached image and PostgreSQL-backed todos persist across application restarts.

### Deployment

The [Release application workflow](../.github/workflows/main.yml) creates the cluster, builds and publishes The Project Docker images to Google Artifact Registry, and deploys the app, backend, PostgreSQL, and hourly CronJob to GKE. It runs when either service changes and can also be started manually.

Wait for the workflow to finish, then find the ingress address:

```sh
kubectl -n project get ingress --watch
```

The app should be available at http://<INGRESS_ADDRESS>/ once the IP address is assigned.

### Endpoints

- `GET /` — displays the todo application.
- `GET /image` — serves the persistently cached Lorem Picsum image.
- `POST /shutdown` — shuts down the Node process so Kubernetes can restart the container.

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.

### DBaaS vs DIY

#### Setup and maintenance

##### Initial setup

- Cloud SQL: You have to create an instance, choose its capacity and region, create the database and users, and configure backups and availability. Connecting GKE also requires network access and authentication config.

- DIY: Configure the image, StatefulSet, Service, credentials (Secrets), PV and PVC. Monitoring, backups and recovery would need implementation as well.

##### Maintenance

- Cloud SQL: Google takes care of OS and DB maintenance updates, but you'll still have to manage access, schema migrations, query performance, capacity and alerts. [Maintenance can interrupt connections](https://docs.cloud.google.com/sql/docs/postgres/shared-responsibility), so it needs planning.

- DIY: You maintain the PostgreSQL image, apply security fixes, plan upgrades, monitor the database, expand storage and troubleshoot failures. So this requires more time and expertise.

##### Availability

- Cloud SQL: Regional HA provides a standby in another zone and managed failover.

- DIY: Single replica has downtime while its Pod or node recovers. The PVC preserves data across Pod restarts, but does not provide database failover. Simply increasing StatefulSet replicas does not configure replication, so HA requires PostgreSQL replication, failure detection and promotion, plus additional compute and storage. 

##### Control and portability

- Cloud SQL: Less infrastructure to operate.

- DIY: More control over versions, extensions, configuration and backup tooling. K8s manifests can be reused elsewhere, but moving the database still requires transferring data and adapting storage and networking.

#### Costs

Neither option requires buying hardware upfront. The initial cost is setup time and the cloud resources provisioned during setup.

- Cloud SQL (higher):
    + Database compute charges even when the application is idle.
    + Provisioned storage and backup storage.
    + Network charges.
    + HA adds compute and storage charges.
- DIY (lower):
    + GKE compute, Persistent Disks, backup storage and network traffic cost money.
    + Maintenance, incident response and restore testing also have a labor cost.
    + A small basic DB is low cost, but if we need larger or additional nodes, that saving decreases.

#### Backup methods and ease of recovery

- Cloud SQL:
    + Supports scheduled and on-demand backups with configurable retention.
    + Google manages their creation and storage and you only configure the policy, checks results and tests restores.
    + Restores are available through the console or CLI, making routine recovery easier to operate.

- DIY (PostgreSQL):
    + Logical dumps: schedule `pg_dump` with a CronJob and upload the result to storage outside the cluster, such as Cloud Storage.
        * A dump provides a consistent database snapshot while the database remains available.
        * You can restore a custom-format dump with `pg_restore`, or with a plain SQL dump with `psql`.
        * It's straightforward for a small database and portable between PostgreSQL installations, but recovery loses changes since the last successful dump and can be slow for large databases.
    + Volume snapshots: GKE supports [CSI volume snapshots](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/volume-snapshots), which can be restored into a PVC. PostgreSQL data  must be captured consistently.
