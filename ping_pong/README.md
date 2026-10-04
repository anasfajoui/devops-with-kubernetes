## Ping Pong

### Endpoints

- `GET /pingpong` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.

### Deployment

`manifests/secret.enc.yaml` is encrypted with SOPS and must be decrypted before K8s can use it:

```bash
export SOPS_AGE_KEY_FILE=/path/to/your/age-private-key.txt
sops --decrypt manifests/secret.enc.yaml | kubectl apply -f -
```

Then apply the remaining unencrypted manifests explicitly:

```bash
kubectl apply \
  -f manifests/configmap.yaml \
  -f manifests/postgres-service.yaml \
  -f manifests/postgres-statefulset.yaml \
  -f manifests/service.yaml \
  -f manifests/deployment.yaml
```

This app shares an ingress with log_output app, so you might want to do `kubectl apply -f ../log_output/manifests` as well.

Wait for PostgreSQL and Ping-pong to start, then find the ingress address:

```bash
kubectl -n exercises get ingress --watch
```

The app is available at `http://<INGRESS_ADDRESS>/pingpong` once the IP address is assigned.
