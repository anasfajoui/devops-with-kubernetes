## Log Output

- The reader fetches the current pong count from the Ping Pong application's `GET /pings` endpoint through the `ping-pong-svc` K8s Service.
- The writer and reader containers only share their generated log through an `emptyDir` volume inside the Log Output pod.
- The `log-output-config` ConfigMap provides `/config/information.txt` as a mounted file and `MESSAGE` as an environment variable.

### Endpoints

- `GET /` returns the configured file and environment values, latest timestamped log output, and pong count fetched from the Ping Pong application.
- `GET /readyz` returns `200` when the reader can fetch a valid counter from Ping Pong's `/pings` endpoint, or `503` if the request fails, times out or returns invalid data. This will be used mainly for K8s Readiness probe.

### Deployment

On a push to `main`, the workflow builds the Log Output reader, writer and Ping-pong images, pushes them to the registry, and commits their tags. It provisions the Ping-pong database Secret from SOPS and applies the `log-output` Argo CD Application. [Release application workflow](../.github/workflows/main.yml)

To view the Application, open the Argo CD HTTPS address in the workflow summary and select **ping-pong** after signing in. For the first sign-in, use `admin` and retrieve the initial password with your kubectl context set to the GKE cluster.

```sh
kubectl -n argocd get secret argocd-initial-admin-secret -o go-template='{{.data.password | base64decode}}'
```

### Gateway address

Find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/` once the IP address is assigned.
