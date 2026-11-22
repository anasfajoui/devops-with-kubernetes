## Ping Pong

### Endpoints

- `GET /` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.
- `GET /readyz` returns `200` when a fresh PostgreSQL `SELECT 1` succeeds, or `503` when the database cannot be reached or the query fails.

The Gateway accepts `GET /pingpong` and rewrites its path to `/` before forwarding it to Ping Pong. Its health check uses `/pings`, so probes do not increment the counter.

### Deployment

The workflow creates the shared `log-output` Argo CD Application on a push to `main`. It automatically syncs Ping-pong and its PostgreSQL StatefulSet to the `exercises` namespace alongside Log Output. [Log Output deployment](../log_output/README.md#deployment)

### Gateway address

Wait for PostgreSQL and Ping-pong to start, then find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/pingpong` once the IP address is assigned.
