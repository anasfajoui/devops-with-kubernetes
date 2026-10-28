## Log Output

- The reader fetches the current pong count from the Ping Pong application's `GET /pings` endpoint through the `ping-pong-svc` K8s Service.
- The writer and reader containers only share their generated log through an `emptyDir` volume inside the Log Output pod.
- The `log-output-config` ConfigMap provides `/config/information.txt` as a mounted file and `MESSAGE` as an environment variable.

### Endpoints

- `GET /` returns the configured file and environment values, latest timestamped log output, and pong count fetched from the Ping Pong application.
- `GET /readyz` returns `200` when the reader can fetch a valid counter from Ping Pong's `/pings` endpoint, or `503` if the request fails, times out or returns invalid data. This will be used mainly for K8s Readiness probe.

### Deployment

The [Release application workflow](../.github/workflows/main.yml) deploys both log output and ping-pong apps.

### Gateway address

Find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/` once the IP address is assigned.
