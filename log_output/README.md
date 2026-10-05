## Log Output

- The reader fetches the current pong count from the Ping Pong application's `GET /pings` endpoint through the `ping-pong-svc` K8s Service.
- The writer and reader containers only share their generated log through an `emptyDir` volume inside the Log Output pod.
- The `log-output-config` ConfigMap provides `/config/information.txt` as a mounted file and `MESSAGE` as an environment variable.

### Endpoints

- `GET /` returns the configured file and environment values, latest timestamped log output, and pong count fetched from the Ping Pong application.

### Deployment

Create the shared namespace, then deploy:

```bash
kubectl apply -f manifests/namespace.yaml
kubectl apply -f manifests
```

This app shares a Gateway with Ping Pong app. Deploy Ping Pong app using the instructions in `../ping_pong/README.md`.

Find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/` once the IP address is assigned.
