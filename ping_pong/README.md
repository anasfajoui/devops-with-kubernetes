Endpoints:

- `GET /pingpong` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.

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

Wait for PostgreSQL and Ping-pong to start, then find the LoadBalancer address:

```bash
kubectl -n exercises get service ping-pong-svc --watch
```

The app is available at `http://<EXTERNAL-IP>/pingpong` once the external IP is assigned.
