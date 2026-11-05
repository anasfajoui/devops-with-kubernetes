## Ping Pong

### Endpoints

- `GET /` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.
- `GET /readyz` returns `200` when a fresh PostgreSQL `SELECT 1` succeeds, or `503` when the database cannot be reached or the query fails.

The Gateway accepts `GET /pingpong` and rewrites its path to `/` before forwarding it to Ping Pong. Its health check uses `/pings`, so probes do not increment the counter.

### Deployment

The [Release application workflow](../.github/workflows/main.yml) uses an Argo Rollout and deploys both ping-pong and log output apps along with an AnalysisTemplate that.

### Exercise 4.4: Your canary

Ping-pong and Log Output use Argo Rollouts. During an update, each runs a canary alongside its stable version, then blocks promotion on its own AnalysisRun using the shared `namespace-cpu` AnalysisTemplate. The existing Services select both versions of their app; traffic is shared through their Pods, so the 50% weight is approximate.

The analysis queries Prometheus in the `monitoring` namespace. It sums `rate(container_cpu_usage_seconds_total[5m])` for all application containers in the Rollout's namespace, including Log Output and PostgreSQL. Empty container labels and the infrastructure `POD` container are excluded to avoid counting Pod totals twice. The namespace comes from the Rollout, so branch environments use their own namespace automatically.

The limit is **0.5 CPU cores (500 millicores)**, configured by `cpu-limit` in [analysis-template.yaml](manifests/analysis-template.yaml). Ten checks run every 30 seconds after a 30-second initial delay, covering approximately five minutes. Any measurement above the limit fails the analysis immediately (`failureLimit: 0`), aborts the update and scales down the canary, leaving the stable version running. Empty results or NaN also fail instead of allowing an unverified update.

The workflow installs the Argo Rollouts controller and CLI before applying these manifests. It waits for the Rollout to finish and reports a failed deployment if the analysis rejects it. The first deployment establishes the stable version and skips canary analysis; test rejection on a subsequent update to that cluster.

To verify rejection with a deliberately low limit:

1. Deploy once with the normal limit and record the stable revision:

   ```sh
   kubectl -n exercises get rollout ping-pong-dep -o jsonpath='{.status.stableRS}'
   ```

2. Change `cpu-limit` in `analysis-template.yaml` from `"0.5"` to `"0.000001"`, then push. The workflow builds a new image tag and starts an update. Keep the cluster from the first deployment for this test.
3. Inspect the analysis and Rollout:

   ```sh
   kubectl -n exercises get analysisruns
   kubectl -n exercises describe rollout ping-pong-dep
   kubectl -n exercises get rollout ping-pong-dep -o jsonpath='{.status.stableRS}'
   kubectl -n exercises get replicasets,pods -l app=ping-pong
   ```

   The AnalysisRun should be `Failed`, the Rollout should report an aborted update, the stable revision should match the recorded value, and the canary ReplicaSet should scale to zero. Use `kubectl -n exercises describe analysisrun <NAME>` to see the CPU value that exceeded the limit. Replace `exercises` with the branch namespace when testing another branch.
4. Restore `"0.5"` and push again to deploy a new revision with the normal limit.

See the [Argo Rollouts analysis documentation](https://argoproj.github.io/argo-rollouts/features/analysis/) for inline analysis and failure handling.

### Gateway address

Wait for PostgreSQL and Ping-pong to start, then find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/pingpong` once the IP address is assigned.
