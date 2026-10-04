## Log Output

- The reader fetches the current pong count from the Ping Pong application's `GET /pings` endpoint through the `ping-pong-svc` K8s Service.
- The writer and reader containers only share their generated log through an `emptyDir` volume inside the Log Output pod.
- The `log-output-config` ConfigMap provides `/config/information.txt` as a mounted file and `MESSAGE` as an environment variable.

### Endpoints

- `GET /` returns the configured file and environment values, latest timestamped log output, and pong count fetched from the Ping Pong application.

### Deployment

Deploy with `kubectl apply -f manifests`.

This app shares an ingress with ping_pong app, so you might want to do `kubectl apply -f ../ping_pong/manifests` as well.

Find the ingress address:

```bash
kubectl -n exercises get ingress --watch
```

The app is available at `http://<INGRESS_ADDRESS>/` once the IP address is assigned.
