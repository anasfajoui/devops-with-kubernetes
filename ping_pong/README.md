## Ping Pong

### Endpoints

- `GET /` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.

The Gateway accepts `GET /pingpong` and rewrites its path to `/` before forwarding it to Ping Pong. Its health check uses `/pings`, so probes do not increment the counter.

### Deployment

The [Release application workflow](../.github/workflows/main.yml) deploys both ping-pong and log output apps.

### Gateway address

Wait for PostgreSQL and Ping-pong to start, then find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/pingpong` once the IP address is assigned.
