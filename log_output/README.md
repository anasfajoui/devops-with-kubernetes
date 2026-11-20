## Log Output

- The reader fetches the current pong count from the Ping Pong application's `GET /pings` endpoint through the `ping-pong-svc` K8s Service.
- The writer and reader containers only share their generated log through an `emptyDir` volume inside the Log Output pod.
- The `log-output-config` ConfigMap provides `/config/information.txt` as a mounted file and `MESSAGE` as an environment variable.

### Endpoints

- `GET /` returns the configured file and environment values, latest timestamped log output, and pong count fetched from the Ping Pong application.
- `GET /readyz` returns `200` when the reader can fetch a valid counter from Ping Pong's `/pings` endpoint, or `503` if the request fails, times out or returns invalid data. This will be used mainly for K8s Readiness probe.

### Deployment

The workflow builds and pushes the Log output reader, writer and Ping-pong images, then commits their image tags. Argo CD watches the `log_output` Kustomization, which includes Ping-pong, PostgreSQL, the Gateway and both Argo Rollouts. The workflow provisions the Ping-pong database Secret from SOPS in the destination namespace. [Release application workflow](../.github/workflows/main.yml)

After the first successful workflow run on a fresh cluster, open the Argo CD HTTPS address in the workflow summary. Sign in as `admin` and retrieve the initial password with your kubectl context set to the GKE cluster.

```sh
kubectl -n argocd get secret argocd-initial-admin-secret -o go-template='{{.data.password | base64decode}}'
```

In **New App**, use these settings for main:

- Application name `log-output`, project `default`, sync policy **Automatic**.
- Repository URL `https://github.com/anasfajoui/devops-with-kubernetes.git`, revision `HEAD`, path `log_output`.
- Destination cluster `https://kubernetes.default.svc`, namespace `exercises`.
- Click **Create**.

### Gateway address

Find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/` once the IP address is assigned.
